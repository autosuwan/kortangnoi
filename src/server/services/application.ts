import "server-only";

import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/api-error";
import {
  APPLICATION_IMAGE_MAX_BYTES,
  MAX_APPLICATION_IMAGES,
  PDPA_VERSION,
  validateApplication,
} from "@/lib/application";
import { detectImageType } from "@/lib/image-type";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStreamerStatus, type StreamerStatus } from "@/server/auth";

const BUCKET = "applications";
const SIGNED_SECONDS = 10 * 60;

export type ApplicationView = {
  realName: string;
  phone: string;
  channelUrls: string[];
  imageUrls: string[];
  pdpaVersion: string;
  pdpaAcceptedAt: string;
  submittedAt: string;
  reviewedAt: string | null;
};

export type MyApplication = {
  status: StreamerStatus;
  note: string | null;
  application: ApplicationView | null;
};

async function signImages(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrls(paths, SIGNED_SECONDS);
  if (error) throw error;
  return data.map((d) => d.signedUrl ?? "").filter(Boolean);
}

/** ใบสมัคร + รูป (signed URL) — ใช้ทั้งเจ้าของและแอดมิน */
export async function readApplication(
  userId: string,
): Promise<ApplicationView | null> {
  const { data, error } = await createAdminClient()
    .from("streamer_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    realName: data.real_name,
    phone: data.phone,
    channelUrls: data.channel_urls,
    imageUrls: await signImages(data.image_paths),
    pdpaVersion: data.pdpa_version,
    pdpaAcceptedAt: data.pdpa_accepted_at,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
  };
}

export async function getMyApplication(userId: string): Promise<MyApplication> {
  const [status, note, application] = await Promise.all([
    getStreamerStatus(userId),
    createAdminClient()
      .from("profiles")
      .select("status_note")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => data?.status_note ?? null),
    readApplication(userId),
  ]);
  return { status, note, application };
}

/** ส่งได้ตอนยังไม่ส่ง / รอตรวจ (แก้ก่อนแอดมินดู) / ไม่อนุมัติ (ส่งใหม่) */
const EDITABLE: StreamerStatus[] = [
  "pending_application",
  "pending",
  "rejected",
];

export async function submitApplication(
  userId: string,
  fields: unknown,
  files: File[],
): Promise<MyApplication> {
  const status = await getStreamerStatus(userId);
  if (!EDITABLE.includes(status)) {
    throw new AppError(409, "APPLICATION_LOCKED", "บัญชีนี้ส่งใบสมัครไม่ได้แล้ว");
  }
  const result = validateApplication(fields);
  if (!result.ok) {
    throw new AppError(
      400,
      result.field === "pdpa" ? "PDPA_REQUIRED" : "APPLICATION_INVALID",
      result.message,
    );
  }
  if (files.length < 1 || files.length > MAX_APPLICATION_IMAGES) {
    throw new AppError(
      400,
      "APPLICATION_INVALID",
      `แนบรูปหน้าช่อง 1–${MAX_APPLICATION_IMAGES} รูป`,
    );
  }
  const images: { bytes: Uint8Array; ext: string; mime: string }[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (
      file.size === 0 ||
      file.size > APPLICATION_IMAGE_MAX_BYTES ||
      !type ||
      type.ext === "gif"
    ) {
      throw new AppError(
        400,
        "APPLICATION_INVALID",
        "รูปต้องเป็น PNG, JPG หรือ WebP ไม่เกิน 4 MB",
      );
    }
    images.push({ bytes, ext: type.ext, mime: type.mime });
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("streamer_applications")
    .select("image_paths")
    .eq("user_id", userId)
    .maybeSingle();

  const paths: string[] = [];
  try {
    for (const img of images) {
      const path = `${userId}/${randomUUID()}.${img.ext}`;
      const up = await admin.storage
        .from(BUCKET)
        .upload(path, img.bytes, { contentType: img.mime });
      if (up.error) throw up.error;
      paths.push(path);
    }
    const v = result.value;
    const now = new Date().toISOString();
    const { error } = await admin.from("streamer_applications").upsert({
      user_id: userId,
      real_name: v.realName,
      phone: v.phone,
      channel_urls: v.channelUrls,
      image_paths: paths,
      pdpa_version: PDPA_VERSION,
      pdpa_accepted_at: now,
      submitted_at: now,
      reviewed_at: null,
      reviewed_by: null,
    });
    if (error) throw error;
    // conditional: แอดมินอาจเพิ่งเปลี่ยนสถานะระหว่างนี้
    const { data: updated, error: statusError } = await admin
      .from("profiles")
      .update({ streamer_status: "pending", status_note: null })
      .eq("id", userId)
      .in("streamer_status", EDITABLE)
      .select("id");
    if (statusError) throw statusError;
    if (!updated?.length) {
      throw new AppError(409, "APPLICATION_LOCKED", "บัญชีนี้ส่งใบสมัครไม่ได้แล้ว");
    }
  } catch (e) {
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    throw e;
  }
  if (before?.image_paths?.length) {
    const { error } = await admin.storage
      .from(BUCKET)
      .remove(before.image_paths);
    if (error) console.error("remove old application images failed", error);
  }
  return getMyApplication(userId);
}

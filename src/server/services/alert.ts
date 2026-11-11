import "server-only";

import { randomUUID } from "node:crypto";

import {
  ALERT_MEDIA_MAX_BYTES,
  alertSettingsUpdateSchema,
  type AlertSettings,
} from "@/lib/alert-settings";
import { AppError } from "@/lib/api-error";
import { detectImageType } from "@/lib/image-type";
import { isKlipyMediaUrl } from "@/lib/klipy";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const BUCKET = "alert-media";
const COLUMNS =
  "media_type, media_url, media_storage_path, duration_sec, sound_enabled, volume";

type Row = Pick<
  Database["public"]["Tables"]["alert_settings"]["Row"],
  | "media_type"
  | "media_url"
  | "media_storage_path"
  | "duration_sec"
  | "sound_enabled"
  | "volume"
>;

function toSettings(row: Row): AlertSettings {
  return {
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    durationSec: row.duration_sec,
    soundEnabled: row.sound_enabled,
    volume: row.volume,
  };
}

const notFound = () => new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");

async function getRow(userId: string): Promise<Row> {
  const { data, error } = await createAdminClient()
    .from("alert_settings")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return data;
}

/** ลบไฟล์เก่าแบบ best effort — ลบไม่สำเร็จไม่ควรทำให้การบันทึกล้ม */
async function removeFile(path: string | null) {
  if (!path) return;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .remove([path]);
  if (error) console.error("remove alert media failed", path, error);
}

export async function getAlertSettings(userId: string): Promise<AlertSettings> {
  return toSettings(await getRow(userId));
}

export async function updateAlertSettings(
  userId: string,
  input: unknown,
): Promise<AlertSettings> {
  const parsed = alertSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, "ALERT_SETTINGS_INVALID", "ค่าที่ตั้งไม่ถูกต้อง");
  }
  const { mediaType, mediaUrl, durationSec, soundEnabled, volume } =
    parsed.data;
  if (mediaType === "gif" && !isKlipyMediaUrl(mediaUrl ?? "")) {
    throw new AppError(400, "MEDIA_URL_NOT_ALLOWED", "ใช้ได้เฉพาะ GIF จาก KLIPY");
  }
  const changeMedia = mediaType !== undefined;
  const before = changeMedia ? await getRow(userId) : null;

  const { data, error } = await createAdminClient()
    .from("alert_settings")
    .update({
      duration_sec: durationSec,
      sound_enabled: soundEnabled,
      volume,
      ...(mediaType === "default" && {
        media_type: "default" as const,
        media_url: null,
        media_storage_path: null,
      }),
      // เก็บ URL ตามที่ KLIPY ส่งมา ไม่ดาวน์โหลดมาเก็บเอง (ข้อกำหนด KLIPY)
      ...(mediaType === "gif" && {
        media_type: "gif" as const,
        media_url: mediaUrl,
        media_storage_path: null,
      }),
    })
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();

  if (before) await removeFile(before.media_storage_path);
  return toSettings(data);
}

export async function uploadAlertMedia(
  userId: string,
  file: File,
): Promise<AlertSettings> {
  if (file.size === 0 || file.size > ALERT_MEDIA_MAX_BYTES) {
    throw new AppError(400, "MEDIA_INVALID", "ไฟล์ต้องไม่เกิน 4 MB");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    throw new AppError(
      400,
      "MEDIA_INVALID",
      "รองรับเฉพาะรูป PNG, JPG, GIF หรือ WebP",
    );
  }

  const before = await getRow(userId);
  const admin = createAdminClient();
  const path = `${userId}/${randomUUID()}.${type.ext}`;

  const upload = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: type.mime,
    // ชื่อไฟล์สุ่มใหม่ทุกครั้ง cache นานได้
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const mediaUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { data, error } = await admin
    .from("alert_settings")
    .update({
      media_type: "upload",
      media_url: mediaUrl,
      media_storage_path: path,
    })
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) {
    await removeFile(path);
    throw error ?? notFound();
  }

  await removeFile(before.media_storage_path);
  return toSettings(data);
}

import "server-only";

import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectImageType } from "@/lib/image-type";
import { validateProfileUpdate, type ProfileImageKind } from "@/lib/profile";
import { checkUsername } from "@/lib/username";
import { isAdmin } from "@/server/auth";

export type Me = {
  id: string;
  username: string | null;
  displayName: string;
  discordId: string | null;
  isAdmin: boolean;
};

const PG_UNIQUE_VIOLATION = "23505";

export async function getMe(userId: string): Promise<Me> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id, username, display_name, discord_id")
    .eq("id", userId)
    .single();
  if (error || !data)
    throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    discordId: data.discord_id,
    isAdmin: isAdmin(data.id),
  };
}

/** username ว่างให้ใช้ไหม (ถ้าเป็นของ userId เองถือว่าว่าง) */
export async function isUsernameAvailable(
  input: string,
  userId?: string,
): Promise<boolean> {
  const check = checkUsername(input);
  if (!check.ok) return false;

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("username", check.username)
    .maybeSingle();
  if (error) throw error;
  return !data || data.id === userId;
}

export async function setUsername(
  userId: string,
  input: string,
): Promise<{ username: string }> {
  const check = checkUsername(input);
  if (!check.ok) throw new AppError(400, "USERNAME_INVALID", check.message);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ username: check.username })
    .eq("id", userId)
    .select("username, display_name")
    .single();

  // unique index ใน DB เป็นตัวตัดสินกรณีจองพร้อมกัน
  if (error?.code === PG_UNIQUE_VIOLATION) {
    throw new AppError(409, "USERNAME_TAKEN", "ชื่อนี้มีคนใช้แล้ว");
  }
  if (error || !data?.username)
    throw error ?? new Error("update username failed");

  // ตั้ง username ครั้งแรก: ชื่อที่แสดงบนหน้าโดเนทเริ่มต้นเป็น username (แก้ทีหลังได้)
  if (!data.display_name) {
    await admin
      .from("profiles")
      .update({ display_name: data.username })
      .eq("id", userId);
  }

  return { username: data.username };
}

// ---------------------------------------------------------------------------
// ตั้งค่าโปรไฟล์ (ชื่อที่แสดง, แนะนำตัว, รูปโปรไฟล์, แบนเนอร์)
// ---------------------------------------------------------------------------

const MEDIA_BUCKET = "profile-media";
const PROFILE_MEDIA_MAX_BYTES = 4 * 1024 * 1024;
const PROFILE_COLUMNS =
  "id, username, display_name, real_name, bio, avatar_url, avatar_path, banner_url, banner_path";

export type ProfileSettings = {
  /** รหัสผู้ใช้ (ใช้ตั้ง ADMIN_USER_IDS) */
  id: string;
  username: string | null;
  displayName: string;
  /** ชื่อจาก Google/Discord — ส่วนตัว ไม่แสดงต่อผู้ชม */
  realName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string;
  real_name: string;
  bio: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  banner_url: string | null;
  banner_path: string | null;
};

const toProfileSettings = (r: ProfileRow): ProfileSettings => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name || r.username || "",
  realName: r.real_name,
  bio: r.bio,
  avatarUrl: r.avatar_url,
  bannerUrl: r.banner_url,
});

async function profileRow(userId: string): Promise<ProfileRow> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();
  if (error || !data)
    throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");
  return data;
}

export async function getProfileSettings(
  userId: string,
): Promise<ProfileSettings> {
  return toProfileSettings(await profileRow(userId));
}

export async function updateProfile(
  userId: string,
  input: unknown,
): Promise<ProfileSettings> {
  const result = validateProfileUpdate(input);
  if (!result.ok) throw new AppError(400, result.code, result.message);
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ display_name: result.value.displayName, bio: result.value.bio })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return toProfileSettings(data);
}

async function removeMediaFile(path: string | null) {
  if (!path) return;
  const { error } = await createAdminClient()
    .storage.from(MEDIA_BUCKET)
    .remove([path]);
  if (error) console.error("remove profile media failed", path, error);
}

/** อัปโหลดรูปโปรไฟล์/แบนเนอร์ (บันทึกทันที แล้วลบไฟล์เก่า) */
export async function uploadProfileImage(
  userId: string,
  kind: ProfileImageKind,
  file: File,
): Promise<ProfileSettings> {
  if (file.size === 0 || file.size > PROFILE_MEDIA_MAX_BYTES) {
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

  const before = await profileRow(userId);
  const admin = createAdminClient();
  const path = `${userId}/${kind}-${randomUUID()}.${type.ext}`;
  const upload = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: type.mime, cacheControl: "31536000" });
  if (upload.error) throw upload.error;
  const url = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    .data.publicUrl;

  const { data, error } = await admin
    .from("profiles")
    .update(
      kind === "avatar"
        ? { avatar_url: url, avatar_path: path }
        : { banner_url: url, banner_path: path },
    )
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    await removeMediaFile(path);
    throw error;
  }
  await removeMediaFile(
    kind === "avatar" ? before.avatar_path : before.banner_path,
  );
  return toProfileSettings(data);
}

export async function removeProfileImage(
  userId: string,
  kind: ProfileImageKind,
): Promise<ProfileSettings> {
  const before = await profileRow(userId);
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update(
      kind === "avatar"
        ? { avatar_url: null, avatar_path: null }
        : { banner_url: null, banner_path: null },
    )
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  await removeMediaFile(
    kind === "avatar" ? before.avatar_path : before.banner_path,
  );
  return toProfileSettings(data);
}

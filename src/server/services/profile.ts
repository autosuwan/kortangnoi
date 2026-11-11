import "server-only";

import { AppError } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ username: check.username })
    .eq("id", userId)
    .select("username")
    .single();

  // unique index ใน DB เป็นตัวตัดสินกรณีจองพร้อมกัน
  if (error?.code === PG_UNIQUE_VIOLATION) {
    throw new AppError(409, "USERNAME_TAKEN", "ชื่อนี้มีคนใช้แล้ว");
  }
  if (error || !data?.username)
    throw error ?? new Error("update username failed");

  return { username: data.username };
}

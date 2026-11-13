import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { errorResponse, unauthorized } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

/** ผู้ใช้ที่ล็อกอินอยู่ (ตรวจ JWT กับ Supabase) หรือ null */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // การตรวจ JWT ใช้เวลาปัจจุบัน → ต้องรันตอน request เท่านั้น ห้าม prerender (Cache Components)
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}

/** ใช้ในหน้าที่ต้องล็อกอิน: ไม่ได้ล็อกอิน → /login */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** เจ้าของระบบ = ADMIN_USER_IDS (ถอนจากหน้าเว็บไม่ได้ เป็นคนให้/ถอนสิทธิ์แอดมิน) */
export function isOwner(userId: string): boolean {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

export type AdminRole = "owner" | "admin" | null;

export function adminRole(userId: string, isAdminFlag: boolean): AdminRole {
  if (isOwner(userId)) return "owner";
  return isAdminFlag ? "admin" : null;
}

/** แอดมิน = เจ้าของระบบ หรือได้รับสิทธิ์จากหน้าเว็บ (profiles.is_admin) */
export async function isAdmin(userId: string): Promise<boolean> {
  if (isOwner(userId)) return true;
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_admin ?? false;
}

export type StreamerStatus = Database["public"]["Enums"]["streamer_status"];

/** สถานะสตรีมเมอร์ (F15) — เจ้าของระบบถือว่าอนุมัติเสมอ */
export async function getStreamerStatus(
  userId: string,
): Promise<StreamerStatus> {
  if (isOwner(userId)) return "approved";
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("streamer_status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.streamer_status ?? "pending_application";
}

/** หน้าเว็บของสตรีมเมอร์: ไม่ได้ล็อกอิน → /login, ยังไม่อนุมัติ → /apply */
export async function requireStreamer(): Promise<CurrentUser> {
  const user = await requireUser();
  if ((await getStreamerStatus(user.id)) !== "approved") redirect("/apply");
  return user;
}

/** route handler ของสตรีมเมอร์: user ที่อนุมัติแล้ว หรือ Response 401/403 ให้ return ทันที */
export async function authorizeStreamer(): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if ((await getStreamerStatus(user.id)) !== "approved") {
    return errorResponse(
      403,
      "STREAMER_NOT_APPROVED",
      "บัญชียังไม่ได้รับอนุมัติเป็นสตรีมเมอร์",
    );
  }
  return user;
}

import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

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

export function isAdmin(userId: string): boolean {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

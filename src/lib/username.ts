import { z } from "zod";

/** คำที่ชนกับ path ของเว็บ — ห้ามใช้เป็น username (ดู docs/spec.md F1) */
export const RESERVED_USERNAMES = new Set([
  "api",
  "auth",
  "login",
  "logout",
  "onboarding",
  "dashboard",
  "overlay",
  "admin",
  "settings",
  "static",
  "_next",
  "d",
  "apply",
  "privacy",
]);

export const USERNAME_RULE_MESSAGE = "ใช้ได้ 3–20 ตัว เฉพาะ a–z, 0–9, _ และ -";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_-]{3,20}$/, USERNAME_RULE_MESSAGE)
  .refine((u) => !RESERVED_USERNAMES.has(u), "ชื่อนี้ใช้ไม่ได้ ลองชื่ออื่น");

export type UsernameCheck =
  { ok: true; username: string } | { ok: false; message: string };

export function checkUsername(input: string): UsernameCheck {
  const result = usernameSchema.safeParse(input);
  return result.success
    ? { ok: true, username: result.data }
    : {
        ok: false,
        message: result.error.issues[0]?.message ?? USERNAME_RULE_MESSAGE,
      };
}

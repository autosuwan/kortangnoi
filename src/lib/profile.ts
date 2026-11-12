import { cleanDonorText } from "@/lib/donation";

export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 160;
export type ProfileImageKind = "avatar" | "banner";

export type ProfileUpdateResult =
  | { ok: true; value: { displayName: string; bio: string | null } }
  | {
      ok: false;
      code: "DISPLAY_NAME_INVALID" | "BIO_INVALID" | "PROFILE_INVALID";
      message: string;
    };

/** ชื่อที่แสดงบนหน้าโดเนท + แนะนำตัว — ขึ้นหน้าสาธารณะ แสดงเป็น text เท่านั้น */
export function validateProfileUpdate(input: unknown): ProfileUpdateResult {
  const body = input as { displayName?: unknown; bio?: unknown } | null;
  if (
    typeof body?.displayName !== "string" ||
    (body.bio != null && typeof body.bio !== "string")
  ) {
    return { ok: false, code: "PROFILE_INVALID", message: "ข้อมูลไม่ถูกต้อง" };
  }
  const displayName = cleanDonorText(body.displayName);
  if (displayName.length < 1 || displayName.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      code: "DISPLAY_NAME_INVALID",
      message: `ชื่อที่แสดงยาว 1–${DISPLAY_NAME_MAX} ตัวอักษร`,
    };
  }
  const bio = cleanDonorText(body.bio ?? "");
  if (bio.length > BIO_MAX) {
    return {
      ok: false,
      code: "BIO_INVALID",
      message: `แนะนำตัวยาวได้ไม่เกิน ${BIO_MAX} ตัวอักษร`,
    };
  }
  return { ok: true, value: { displayName, bio: bio || null } };
}

/** ตัวอักษรแรกของชื่อ ใช้เป็นรูปโปรไฟล์สำรอง — ข้ามสระหน้าภาษาไทย (เ แ โ ใ ไ) ใช้พยัญชนะแรก */
export function initialOf(name: string): string {
  const chars = Array.from(name.trim()).filter(
    (c) => !/[\u0E40-\u0E44]/.test(c),
  );
  return chars[0]?.toUpperCase() ?? "?";
}

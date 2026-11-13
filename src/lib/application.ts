import { z } from "zod";

import { cleanDonorText } from "@/lib/donation";

/** F15 ใบสมัครสตรีมเมอร์ — ใช้ทั้งฟอร์มฝั่ง client และ server (server เป็นตัวตัดสิน) */
export const PDPA_VERSION = "2026-11-13";
export const MAX_CHANNEL_URLS = 3;
export const MAX_APPLICATION_IMAGES = 3;
export const APPLICATION_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const STATUS_NOTE_MAX = 300;

export const STREAMER_STATUS_LABELS = {
  pending_application: "ยังไม่ส่งใบสมัคร",
  pending: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  suspended: "ระงับ",
} as const;
export type StreamerStatusValue = keyof typeof STREAMER_STATUS_LABELS;
export const STREAMER_STATUSES = Object.keys(
  STREAMER_STATUS_LABELS,
) as StreamerStatusValue[];

/** เบอร์มือถือไทย: ตัดขีด/เว้นวรรค → 0[689]xxxxxxxx */
export function normalizePhone(input: string): string {
  return input.replace(/[\s-]/g, "");
}

const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && u.hostname.includes(".");
    } catch {
      return false;
    }
  });

export const applicationSchema = z.object({
  realName: z
    .string()
    .transform(cleanDonorText)
    .pipe(z.string().min(2).max(100)),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^0[689]\d{8}$/)),
  channelUrls: z.array(url).min(1).max(MAX_CHANNEL_URLS),
  pdpa: z.literal(true),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export type ApplicationErrorField =
  "realName" | "phone" | "channelUrls" | "pdpa";

export const APPLICATION_ERRORS: Record<ApplicationErrorField, string> = {
  realName: "กรอกชื่อ-นามสกุลจริง 2–100 ตัวอักษร",
  phone: "เบอร์มือถือ 10 หลัก ขึ้นต้น 06, 08 หรือ 09",
  channelUrls: `ใส่ลิงก์ช่อง 1–${MAX_CHANNEL_URLS} ลิงก์ ขึ้นต้นด้วย https://`,
  pdpa: "ต้องยอมรับนโยบายความเป็นส่วนตัวก่อนส่ง",
};

/** ข้อความ error ช่องแรกที่ผิด (ใช้ทั้งฟอร์มและ API) */
export function validateApplication(
  input: unknown,
):
  | { ok: true; value: ApplicationInput }
  | { ok: false; field: ApplicationErrorField; message: string } {
  const parsed = applicationSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const field = (parsed.error.issues[0]?.path[0] ??
    "realName") as ApplicationErrorField;
  return { ok: false, field, message: APPLICATION_ERRORS[field] };
}

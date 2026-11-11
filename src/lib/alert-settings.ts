import { z } from "zod";

export type AlertMediaType = "default" | "gif" | "upload";

export type AlertSettings = {
  mediaType: AlertMediaType;
  mediaUrl: string | null;
  durationSec: number;
  soundEnabled: boolean;
  volume: number;
  /** คำสนับสนุน เช่น "ให้ค่าข้าว" — แสดงเป็น "<ชื่อ> <คำสนับสนุน> <ยอด> บาท" */
  supportText: string;
  /** สีชื่อผู้บริจาค "#RRGGBB" */
  nameColor: string;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  mediaType: "default",
  mediaUrl: null,
  durationSec: 8,
  soundEnabled: true,
  volume: 80,
  supportText: "โดเนท",
  nameColor: "#FACC15",
};

export const SUPPORT_TEXT_MAX = 40;

/** ตัด control characters + ช่องว่างซ้ำ (ข้อความขึ้นจอไลฟ์ แสดงเป็น text เท่านั้น) */
export function cleanSupportText(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const DEFAULT_ALERT_IMAGE = "/alert-default.png";
export const ALERT_SOUND = "/sounds/alert.wav";
export const ALERT_MEDIA_MAX_BYTES = 4 * 1024 * 1024;
export const DURATION_RANGE = { min: 3, max: 20 } as const;

/**
 * body ของ PUT — รูปที่อัปโหลดเปลี่ยนผ่าน POST /media เท่านั้น
 * ส่วน PUT เปลี่ยนเป็นค่าเริ่มต้น หรือ GIF จาก KLIPY (โดเมนตาม allowlist) ได้
 */
export const alertSettingsUpdateSchema = z
  .object({
    mediaType: z.enum(["default", "gif"]).optional(),
    mediaUrl: z.string().max(2000).optional(),
    durationSec: z
      .number()
      .int()
      .min(DURATION_RANGE.min)
      .max(DURATION_RANGE.max),
    soundEnabled: z.boolean(),
    volume: z.number().int().min(0).max(100),
    supportText: z
      .string()
      .max(200)
      .transform(cleanSupportText)
      .pipe(z.string().min(1).max(SUPPORT_TEXT_MAX)),
    nameColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .transform((c) => c.toUpperCase()),
  })
  // เลือก GIF ต้องส่ง URL มาด้วย (โดเมนเช็กต่อใน service → MEDIA_URL_NOT_ALLOWED)
  .refine((v) => v.mediaType !== "gif" || Boolean(v.mediaUrl), {
    path: ["mediaUrl"],
  });

export type AlertSettingsUpdate = z.infer<typeof alertSettingsUpdateSchema>;

/** รูปที่จะแสดงจริงบน alert */
export function alertImageUrl(
  settings: Pick<AlertSettings, "mediaType" | "mediaUrl">,
) {
  return settings.mediaType !== "default" && settings.mediaUrl
    ? settings.mediaUrl
    : DEFAULT_ALERT_IMAGE;
}

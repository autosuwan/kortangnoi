import { z } from "zod";

import { isKlipyMediaUrl } from "@/lib/klipy";
import {
  TTS_MIN_AMOUNT,
  TTS_VOICE_IDS,
  type TtsMode,
  type TtsVoice,
} from "@/lib/tts";

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
  /** ส่วนที่ผู้บริจาคเลือกเองได้ในหน้าโดเนท (F8) — รูปเลือกได้เฉพาะ GIF จาก KLIPY */
  donorCanPickImage: boolean;
  donorCanPickColor: boolean;
  donorCanPickSupportText: boolean;
  /** F13 เสียงอ่านข้อความ */
  ttsEnabled: boolean;
  ttsMode: TtsMode;
  ttsMinAmountSatang: number;
  ttsVoice: TtsVoice;
  ttsVolume: number;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  mediaType: "default",
  mediaUrl: null,
  durationSec: 8,
  soundEnabled: true,
  volume: 80,
  supportText: "โดเนท",
  nameColor: "#FACC15",
  donorCanPickImage: false,
  donorCanPickColor: false,
  donorCanPickSupportText: false,
  ttsEnabled: false,
  ttsMode: "message",
  ttsMinAmountSatang: 2000,
  ttsVoice: "translate",
  ttsVolume: 100,
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
    donorCanPickImage: z.boolean(),
    donorCanPickColor: z.boolean(),
    donorCanPickSupportText: z.boolean(),
    ttsEnabled: z.boolean(),
    ttsMode: z.enum(["message", "full"]),
    ttsMinAmountSatang: z
      .number()
      .int()
      .min(TTS_MIN_AMOUNT.min)
      .max(TTS_MIN_AMOUNT.max),
    ttsVoice: z.enum(TTS_VOICE_IDS),
    ttsVolume: z.number().int().min(0).max(100),
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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** สิ่งที่ผู้บริจาคเลือกในหน้าโดเนท (ยังไม่ได้ตรวจ — มาจาก client) */
export type DonorAlertChoice = {
  mediaUrl?: unknown;
  nameColor?: unknown;
  supportText?: unknown;
};

/** ค่าที่ผู้บริจาคเลือกได้จริง หลังเช็กสิทธิ์ที่สตรีมเมอร์เปิด + validate (null = ใช้ค่าของสตรีมเมอร์) */
export type DonorAlertStyle = {
  mediaUrl: string | null;
  nameColor: string | null;
  supportText: string | null;
};

/**
 * กรองสิ่งที่ผู้บริจาคเลือก: ใช้ได้เฉพาะส่วนที่สตรีมเมอร์เปิดไว้และผ่าน validation
 * ส่วนที่ไม่ผ่านถูกทิ้งเงียบๆ (ใช้ค่าของสตรีมเมอร์แทน) — ใช้ฝั่ง server ตอนสร้างโดเนท (F8)
 */
export function resolveDonorAlertStyle(
  settings: Pick<
    AlertSettings,
    "donorCanPickImage" | "donorCanPickColor" | "donorCanPickSupportText"
  >,
  choice: DonorAlertChoice | null | undefined,
): DonorAlertStyle {
  const { mediaUrl, nameColor, supportText } = choice ?? {};
  const text =
    typeof supportText === "string" ? cleanSupportText(supportText) : "";
  return {
    mediaUrl:
      settings.donorCanPickImage &&
      typeof mediaUrl === "string" &&
      mediaUrl.length <= 2000 &&
      isKlipyMediaUrl(mediaUrl)
        ? mediaUrl
        : null,
    nameColor:
      settings.donorCanPickColor &&
      typeof nameColor === "string" &&
      HEX_COLOR.test(nameColor)
        ? nameColor.toUpperCase()
        : null,
    supportText:
      settings.donorCanPickSupportText &&
      text.length >= 1 &&
      text.length <= SUPPORT_TEXT_MAX
        ? text
        : null,
  };
}

/** หน้าตา alert ที่จะแสดงจริง = ค่าของสตรีมเมอร์ ทับด้วยสิ่งที่ผู้บริจาคเลือก (ที่ผ่านการกรองแล้ว) */
export function effectiveAlertStyle(
  settings: Pick<
    AlertSettings,
    "mediaType" | "mediaUrl" | "nameColor" | "supportText"
  >,
  donor: DonorAlertStyle | null,
) {
  return {
    imageUrl: donor?.mediaUrl ?? alertImageUrl(settings),
    nameColor: donor?.nameColor ?? settings.nameColor,
    supportText: donor?.supportText ?? settings.supportText,
  };
}

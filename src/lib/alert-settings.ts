import { z } from "zod";

export type AlertMediaType = "default" | "gif" | "upload";

export type AlertSettings = {
  mediaType: AlertMediaType;
  mediaUrl: string | null;
  durationSec: number;
  soundEnabled: boolean;
  volume: number;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  mediaType: "default",
  mediaUrl: null,
  durationSec: 8,
  soundEnabled: true,
  volume: 80,
};

export const DEFAULT_ALERT_IMAGE = "/alert-default.png";
export const ALERT_SOUND = "/sounds/alert.wav";
export const ALERT_MEDIA_MAX_BYTES = 4 * 1024 * 1024;
export const DURATION_RANGE = { min: 3, max: 20 } as const;

/** body ของ PUT — รูปที่อัปโหลดเปลี่ยนผ่าน POST /media เท่านั้น ส่วน PUT ทำได้แค่กลับไปใช้ค่าเริ่มต้น */
export const alertSettingsUpdateSchema = z.object({
  mediaType: z.literal("default").optional(),
  durationSec: z.number().int().min(DURATION_RANGE.min).max(DURATION_RANGE.max),
  soundEnabled: z.boolean(),
  volume: z.number().int().min(0).max(100),
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

import type { AlertSettings } from "@/lib/alert-settings";

/**
 * ข้อมูลที่ส่งไป overlay (ขึ้นจอไลฟ์) — มีเฉพาะชื่อที่ผู้บริจาคกรอก ยอด ข้อความ และหน้าตา alert
 * ห้ามมีชื่อจริง/ข้อมูลบัญชีจากสลิป (CLAUDE.md)
 */
export type OverlayAlert = {
  donationId: string;
  donorName: string;
  amountSatang: number;
  message: string | null;
  isTest: boolean;
  imageUrl: string;
  nameColor: string;
  supportText: string;
  /** F13 เสียงอ่าน: ข้อความสำหรับเสียง Google แปลภาษา (overlay ดึงเสียงเอง) */
  ttsText: string | null;
  /** F13 เสียงอ่าน: signed URL ของไฟล์จาก Google Cloud TTS (อายุ 10 นาที) */
  ttsUrl: string | null;
};

/** ค่าที่ overlay ต้องใช้ (ไม่รวมสิทธิ์ของผู้บริจาค) */
export type OverlaySettings = Pick<
  AlertSettings,
  | "mediaType"
  | "mediaUrl"
  | "durationSec"
  | "soundEnabled"
  | "volume"
  | "supportText"
  | "nameColor"
  | "ttsVolume"
>;

export type OverlayConfig = { channel: string; settings: OverlaySettings };

export const OVERLAY_EVENTS = {
  donation: "donation",
  settings: "settings",
  revoked: "revoked",
} as const;

export const OVERLAY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

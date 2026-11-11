import "server-only";

import { randomBytes } from "node:crypto";

import { effectiveAlertStyle } from "@/lib/alert-settings";
import { AppError } from "@/lib/api-error";
import { publicEnv } from "@/lib/env";
import {
  OVERLAY_EVENTS,
  OVERLAY_TOKEN_PATTERN,
  type OverlayAlert,
  type OverlayConfig,
} from "@/lib/overlay";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  broadcastToOverlay,
  getOverlayToken,
  overlayChannelName,
} from "@/server/realtime/overlay";
import { getAlertSettings } from "@/server/services/alert";

const TEST_COOLDOWN_MS = 3000;

const invalidLink = () =>
  new AppError(404, "OVERLAY_NOT_FOUND", "ลิงก์ overlay ไม่ถูกต้อง");

export function overlayUrl(token: string) {
  return `${publicEnv.siteUrl.replace(/\/$/, "")}/overlay/${token}`;
}

/** หน้า overlay (ไม่ล็อกอิน) ใช้ token ในลิงก์ดึงค่า alert + ชื่อ channel */
export async function getOverlayByToken(token: string): Promise<OverlayConfig> {
  if (!OVERLAY_TOKEN_PATTERN.test(token)) throw invalidLink();

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("overlay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw invalidLink();

  const s = await getAlertSettings(data.id);
  return {
    channel: overlayChannelName(token),
    settings: {
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl,
      durationSec: s.durationSec,
      soundEnabled: s.soundEnabled,
      volume: s.volume,
      supportText: s.supportText,
      nameColor: s.nameColor,
    },
  };
}

export async function getOverlayUrl(userId: string): Promise<string> {
  const token = await getOverlayToken(userId);
  if (!token) throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");
  return overlayUrl(token);
}

/** สร้างลิงก์ใหม่ — ลิงก์เก่าใช้ไม่ได้ทันที และ overlay เก่าได้รับ event revoked */
export async function regenerateOverlayToken(
  userId: string,
): Promise<{ overlayUrl: string }> {
  const oldToken = await getOverlayToken(userId);
  const token = randomBytes(32).toString("base64url");

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ overlay_token: token })
    .eq("id", userId);
  if (error) throw error;

  if (oldToken) {
    await broadcastToOverlay(oldToken, OVERLAY_EVENTS.revoked, {}).catch((e) =>
      console.error("notify revoked overlay failed", e),
    );
  }
  return { overlayUrl: overlayUrl(token) };
}

/** ส่ง alert ตัวอย่างไป overlay จริง ใช้ค่าที่บันทึกแล้ว — จำกัด 1 ครั้ง/3 วินาที */
export async function sendTestAlert(userId: string): Promise<{ ok: true }> {
  // conditional update เป็นตัวตัดสิน rate limit (serverless ไม่มี memory ร่วม)
  const cutoff = new Date(Date.now() - TEST_COOLDOWN_MS).toISOString();
  const { data, error } = await createAdminClient()
    .from("alert_settings")
    .update({ last_test_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`last_test_at.is.null,last_test_at.lt.${cutoff}`)
    .select("user_id");
  if (error) throw error;
  if (!data?.length) {
    throw new AppError(429, "RATE_LIMITED", "รอสักครู่แล้วลองใหม่");
  }

  const [settings, token] = await Promise.all([
    getAlertSettings(userId),
    getOverlayToken(userId),
  ]);
  if (!token) throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");

  const style = effectiveAlertStyle(settings, null);
  const alert: OverlayAlert = {
    donationId: `test-${randomBytes(8).toString("hex")}`,
    donorName: "ผู้ชมใจดี",
    amountSatang: 10000,
    message: "ทดสอบ alert จาก KORTANGNOI",
    isTest: true,
    ...style,
  };
  await broadcastToOverlay(token, OVERLAY_EVENTS.donation, alert);
  return { ok: true };
}

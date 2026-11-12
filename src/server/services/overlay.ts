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
import { prepareAlertSpeech } from "@/server/services/tts";

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
      ttsVolume: s.ttsVolume,
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

/**
 * กันกดรัว: ปุ่มทดสอบ alert และแสดง alert ซ้ำ ใช้ได้ 1 ครั้ง/3 วินาที (ร่วมกัน)
 * conditional update เป็นตัวตัดสิน (serverless ไม่มี memory ร่วม)
 */
async function claimAlertCooldown(userId: string) {
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
}

/** ส่ง alert ตัวอย่างไป overlay จริง ใช้ค่าที่บันทึกแล้ว — จำกัด 1 ครั้ง/3 วินาที */
export async function sendTestAlert(userId: string): Promise<{ ok: true }> {
  await claimAlertCooldown(userId);

  const [settings, token] = await Promise.all([
    getAlertSettings(userId),
    getOverlayToken(userId),
  ]);
  if (!token) throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");

  const style = effectiveAlertStyle(settings, null);
  const content = {
    donorName: "ผู้ชมใจดี",
    amountSatang: 10000,
    message: "ทดสอบ alert จาก KORTANGNOI",
  };
  const alert: OverlayAlert = {
    donationId: `test-${randomBytes(8).toString("hex")}`,
    ...content,
    isTest: true,
    ...style,
    ...(await prepareAlertSpeech(userId, settings, {
      ...content,
      supportText: style.supportText,
    })),
  };
  await broadcastToOverlay(token, OVERLAY_EVENTS.donation, alert);
  return { ok: true };
}

/**
 * ส่ง alert ของโดเนทที่ผ่านแล้วไป overlay — ใช้ทั้งตรวจสลิปอัตโนมัติ (F10) และกดอนุมัติ (F6)
 * payload มีเฉพาะสิ่งที่ผู้บริจาคกรอก/เลือก ห้ามมีชื่อจริงหรือข้อมูลบัญชีจากสลิป
 */
export async function sendDonationAlert(
  donationId: string,
  { replay = false }: { replay?: boolean } = {},
): Promise<void> {
  const { data, error } = await createAdminClient()
    .from("donations")
    .select(
      "id, streamer_id, status, donor_name, amount_satang, message, donor_media_url, donor_name_color, donor_support_text",
    )
    .eq("id", donationId)
    .single();
  if (error) throw error;
  if (data.status !== "approved") return;

  const [settings, token] = await Promise.all([
    getAlertSettings(data.streamer_id),
    getOverlayToken(data.streamer_id),
  ]);
  if (!token) return;

  const style = effectiveAlertStyle(settings, {
    mediaUrl: data.donor_media_url,
    nameColor: data.donor_name_color,
    supportText: data.donor_support_text,
  });
  const content = {
    donorName: data.donor_name,
    amountSatang: data.amount_satang,
    message: data.message,
  };
  const alert: OverlayAlert = {
    // overlay กันซ้ำด้วย donationId — แสดงซ้ำต้องใช้ id ใหม่
    donationId: replay
      ? `${data.id}:replay:${randomBytes(4).toString("hex")}`
      : data.id,
    ...content,
    isTest: false,
    ...style,
    ...(await prepareAlertSpeech(data.streamer_id, settings, {
      ...content,
      supportText: style.supportText,
    })),
  };
  await broadcastToOverlay(token, OVERLAY_EVENTS.donation, alert);
}

/** แสดง alert ของโดเนทที่ผ่านแล้วอีกครั้ง (กดจากหน้าประวัติ) */
export async function replayDonationAlert(
  userId: string,
  donationId: string,
): Promise<{ ok: true }> {
  const { data, error } = await createAdminClient()
    .from("donations")
    .select("status")
    .eq("id", donationId)
    .eq("streamer_id", userId)
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) throw new AppError(404, "NOT_FOUND", "ไม่พบรายการนี้");
  if (data.status !== "approved") {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "แสดง alert ได้เฉพาะรายการที่ผ่านแล้ว",
    );
  }
  await claimAlertCooldown(userId);
  await sendDonationAlert(donationId, { replay: true });
  return { ok: true };
}

import "server-only";

import { randomUUID } from "node:crypto";

import type { AlertSettings } from "@/lib/alert-settings";
import { AppError } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTtsText,
  isCloudVoice,
  previewTtsText,
  TTS_VOICE_IDS,
  type TtsMode,
  type TtsVoice,
} from "@/lib/tts";
import {
  synthesizeSpeech,
  TtsUnavailableError,
  type SpeechAudio,
} from "@/server/integrations/google-tts";

const BUCKET = "tts-audio";
const SIGNED_URL_SECONDS = 10 * 60;
const KEEP_MS = 60 * 60 * 1000;
const PREVIEW_COOLDOWN_MS = 3000;

/** ลบไฟล์เสียงเก่ากว่า 1 ชม. ของผู้ใช้ (best effort) กันพื้นที่ฟรีเต็ม */
async function cleanupOldAudio(userId: string) {
  const storage = createAdminClient().storage.from(BUCKET);
  const { data, error } = await storage.list(userId, { limit: 100 });
  if (error || !data) return;
  const cutoff = Date.now() - KEEP_MS;
  const old = data
    .filter((f) => f.created_at && Date.parse(f.created_at) < cutoff)
    .map((f) => `${userId}/${f.name}`);
  if (old.length) await storage.remove(old);
}

export type AlertSpeech = { ttsText: string | null; ttsUrl: string | null };

/**
 * เตรียมเสียงอ่านของ alert
 * - เสียง translate (ค่าเริ่มต้น): ส่งแค่ข้อความ overlay ดึงเสียงจาก Google แปลภาษาเอง
 * - เสียง Cloud: สร้างไฟล์ฝั่ง server แล้วส่ง signed URL
 * ไม่ต้องอ่าน → null ทั้งคู่; Cloud TTS ล่ม/ไม่มี key → null (alert ยังขึ้นได้)
 */
export async function prepareAlertSpeech(
  userId: string,
  settings: Pick<
    AlertSettings,
    "ttsEnabled" | "ttsMode" | "ttsMinAmountSatang" | "ttsVoice"
  >,
  alert: {
    donorName: string;
    supportText: string;
    amountSatang: number;
    message: string | null;
  },
): Promise<AlertSpeech> {
  const none = { ttsText: null, ttsUrl: null };
  const text = buildTtsText({
    enabled: settings.ttsEnabled,
    mode: settings.ttsMode,
    minAmountSatang: settings.ttsMinAmountSatang,
    ...alert,
  });
  if (!text) return none;
  if (!isCloudVoice(settings.ttsVoice)) return { ttsText: text, ttsUrl: null };

  try {
    const audio = await synthesizeSpeech(text, settings.ttsVoice);
    const storage = createAdminClient().storage.from(BUCKET);
    const path = `${userId}/${randomUUID()}.${audio.ext}`;
    const upload = await storage.upload(path, audio.bytes, {
      contentType: audio.contentType,
    });
    if (upload.error) throw upload.error;
    const signed = await storage.createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signed.error) throw signed.error;
    await cleanupOldAudio(userId).catch(() => {});
    return { ttsText: null, ttsUrl: signed.data.signedUrl };
  } catch (error) {
    console.error(
      "prepare alert speech failed",
      error instanceof Error ? error.message : error,
    );
    return none;
  }
}

/** ฟังตัวอย่างเสียง Cloud ในหน้าตั้งค่า (เสียง translate เล่นในเบราว์เซอร์เอง) — จำกัด 1 ครั้ง/3 วินาที */
export async function previewSpeech(
  userId: string,
  input: unknown,
): Promise<SpeechAudio> {
  const body = input as {
    ttsMode?: unknown;
    ttsVoice?: unknown;
    supportText?: unknown;
  } | null;
  const mode: TtsMode = body?.ttsMode === "full" ? "full" : "message";
  const voice = TTS_VOICE_IDS.includes(body?.ttsVoice as TtsVoice)
    ? (body!.ttsVoice as TtsVoice)
    : null;
  if (!voice || !isCloudVoice(voice))
    throw new AppError(400, "TTS_VOICE_INVALID", "ไม่รู้จักเสียงนี้");
  const supportText =
    typeof body?.supportText === "string" && body.supportText.trim()
      ? body.supportText.slice(0, 40)
      : "โดเนท";

  const cutoff = new Date(Date.now() - PREVIEW_COOLDOWN_MS).toISOString();
  const { data, error } = await createAdminClient()
    .from("alert_settings")
    .update({ tts_preview_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`tts_preview_at.is.null,tts_preview_at.lt.${cutoff}`)
    .select("user_id");
  if (error) throw error;
  if (!data?.length) {
    throw new AppError(429, "RATE_LIMITED", "รอสักครู่แล้วลองใหม่");
  }

  const text = previewTtsText(mode, supportText);
  try {
    return await synthesizeSpeech(text, voice);
  } catch (error) {
    if (error instanceof TtsUnavailableError) {
      console.error("tts preview failed", error.message);
      throw new AppError(502, "TTS_UNAVAILABLE", "สร้างเสียงอ่านไม่ได้ตอนนี้");
    }
    throw error;
  }
}

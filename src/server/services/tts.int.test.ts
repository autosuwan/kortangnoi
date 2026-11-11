import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_ALERT_SETTINGS,
  type AlertSettings,
} from "@/lib/alert-settings";
import type { OverlayAlert } from "@/lib/overlay";
import { subscribeAsOverlay } from "../../../test/realtime";
import { adminClient, createTestUser } from "../../../test/supabase";
import { overlayChannelName } from "../realtime/overlay";

import { updateAlertSettings } from "./alert";
import { sendTestAlert } from "./overlay";
import { previewSpeech } from "./tts";

// test รันด้วย TTS_PROVIDER=fake — ไม่เรียก Google จริง
const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((c) => c()));
});

/** ค่าที่ PUT ได้ (ไม่รวมรูป ซึ่งเปลี่ยนผ่าน media/GIF) */
const editable = (patch: Partial<AlertSettings>) =>
  Object.fromEntries(
    Object.entries({ ...DEFAULT_ALERT_SETTINGS, ...patch }).filter(
      ([k]) => k !== "mediaType" && k !== "mediaUrl",
    ),
  );

async function testAlertFor(patch: Partial<AlertSettings>) {
  const user = await createTestUser("tts");
  await updateAlertSettings(user.id, editable(patch));
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", user.id)
    .single();
  const overlay = await subscribeAsOverlay(
    overlayChannelName(data!.overlay_token),
    ["donation"],
  );
  closers.push(overlay.close);
  await sendTestAlert(user.id);
  await expect.poll(() => overlay.received.length, { timeout: 5000 }).toBe(1);
  return { user, alert: overlay.received[0].payload as OverlayAlert };
}

describe("TTS ใน alert", () => {
  it("เปิดอ่าน → alert มี ttsUrl ที่โหลดเสียงได้", async () => {
    const { alert } = await testAlertFor({ ttsEnabled: true, ttsMode: "full" });
    expect(alert.ttsUrl).toMatch(/\/storage\/v1\/object\/sign\/tts-audio\//);
    const res = await fetch(alert.ttsUrl!);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^audio\//);
  });

  it.each([
    ["ปิดไว้", { ttsEnabled: false }],
    ["ยอดต่ำกว่าขั้นต่ำที่อ่าน", { ttsEnabled: true, ttsMinAmountSatang: 20000 }],
  ])("ไม่อ่าน: %s", async (_, patch) => {
    const { alert } = await testAlertFor(patch);
    expect(alert.ttsUrl).toBeNull();
  });

  it("TTS ล่ม → alert ยังส่งได้ แค่ไม่มีเสียงอ่าน", async () => {
    const { alert } = await testAlertFor({
      ttsEnabled: true,
      ttsMode: "full",
      supportText: "[tts-fail]",
    });
    expect(alert.donorName).toBe("ผู้ชมใจดี");
    expect(alert.ttsUrl).toBeNull();
  });
});

describe("ฟังตัวอย่าง", () => {
  it("ได้ไฟล์เสียง + จำกัด 1 ครั้ง/3 วินาที", async () => {
    const user = await createTestUser("tts-preview");
    const audio = await previewSpeech(user.id, {
      ttsMode: "full",
      ttsVoice: "th-TH-Chirp3-HD-Kore",
      supportText: "ให้ค่าข้าว",
    });
    expect(audio.bytes.length).toBeGreaterThan(100);
    await expect(
      previewSpeech(user.id, { ttsVoice: "th-TH-Chirp3-HD-Kore" }),
    ).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });

  it("เสียงนอก allowlist → 400", async () => {
    const user = await createTestUser("tts-voice");
    await expect(
      previewSpeech(user.id, { ttsVoice: "en-US-Standard-A" }),
    ).rejects.toMatchObject({ status: 400, code: "TTS_VOICE_INVALID" });
  });

  it("TTS ล่ม → 502 TTS_UNAVAILABLE", async () => {
    const user = await createTestUser("tts-down");
    await expect(
      previewSpeech(user.id, {
        ttsMode: "full",
        ttsVoice: "th-TH-Standard-A",
        supportText: "[tts-fail]",
      }),
    ).rejects.toMatchObject({ status: 502, code: "TTS_UNAVAILABLE" });
  });
});

it("DB CHECK กันเสียง/โหมดนอกรายการ", async () => {
  const user = await createTestUser("tts-check");
  for (const patch of [{ tts_voice: "en-US-x" }, { tts_mode: "all" }]) {
    const { error } = await adminClient()
      .from("alert_settings")
      .update(patch)
      .eq("user_id", user.id);
    expect(error?.code, JSON.stringify(patch)).toBe("23514");
  }
});

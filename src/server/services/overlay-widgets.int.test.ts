import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { subscribeAsOverlay } from "../../../test/realtime";
import { fakeSlipPayload, goodSlip, slipFile } from "../../../test/slip";
import { createReadyStreamer } from "../../../test/streamer";
import { adminClient, signedInClient } from "../../../test/supabase";
import { overlayChannelName } from "../realtime/overlay";
import { createDonation } from "./donation";
import { sendTestAlert } from "./overlay";
import {
  controlTimer,
  getOverlayWidgetSettings,
  getTimer,
  getWidgetData,
  removeAvatarImage,
  resetGoal,
  uploadAvatarImage,
  updateOverlayWidgetSettings,
} from "./overlay-widgets";
import { verifySlip } from "./slip";
import {
  applyAllRoundDonations,
  applyDonationTimer,
  getDonationDetail,
  listRoundDonations,
} from "./streamer-donations";
import { DEFAULT_STYLES } from "@/lib/overlay-widgets";

const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((c) => c()));
});
const ip = () =>
  `10.9.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

async function tokenOf(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", userId)
    .single();
  return data!.overlay_token;
}

async function approved(
  username: string,
  donorName: string,
  amount: string,
  opts: { anonymous?: boolean; timerDirection?: "add" | "subtract" } = {},
) {
  const d = await createDonation(
    username,
    {
      donorName,
      amount,
      anonymous: opts.anonymous,
      timerDirection: opts.timerDirection,
    },
    ip(),
  );
  const r = await verifySlip(
    d.donationId,
    d.accessToken,
    await slipFile(
      fakeSlipPayload({ data: goodSlip(Math.round(Number(amount) * 100)) }),
    ),
  );
  expect(r.status).toBe("approved");
  return d.donationId;
}

const settings = {
  goalTitle: "ซื้อไมค์ใหม่",
  goalTargetSatang: 100000,
  qrCaption: "สแกนเลย",
  topPeriod: "all",
  topCount: 3,
  recentCount: 3,
  timerInitialSec: 3600,
  timerStepSatang: 1000,
  timerStepSeconds: 60,
  timerLabel: "Subathon",
  timerMode: "auto",
  timerAllowSubtract: false,
  styles: {
    ...DEFAULT_STYLES,
    goal: { ...DEFAULT_STYLES.goal, width: 420, barFrom: "#22C55E" },
  },
};

describe("F14 overlay widgets", () => {
  it("ผู้ใช้ใหม่มีค่าเริ่มต้น + บันทึก/validate + แจ้ง overlay ให้โหลดใหม่", async () => {
    const s = await createReadyStreamer("wset");
    expect(await getOverlayWidgetSettings(s.id)).toMatchObject({
      goalTitle: "เป้าหมายโดเนท",
      goalTargetSatang: 100000,
      topPeriod: "month",
      topCount: 5,
      recentCount: 10,
      timerInitialSec: 3600,
      timerLabel: "Subathon",
      styles: DEFAULT_STYLES,
    });

    const overlay = await subscribeAsOverlay(
      overlayChannelName(await tokenOf(s.id)),
      ["settings"],
    );
    closers.push(overlay.close);
    expect(overlay.status).toBe("SUBSCRIBED");
    expect(await updateOverlayWidgetSettings(s.id, settings)).toMatchObject(
      settings,
    );
    await expect
      .poll(() => overlay.received.map((r) => r.event))
      .toContain("settings");

    await expect(
      updateOverlayWidgetSettings(s.id, { ...settings, topCount: 99 }),
    ).rejects.toMatchObject({ status: 400, code: "OVERLAY_WIDGETS_INVALID" });
    await expect(
      updateOverlayWidgetSettings(s.id, {
        ...settings,
        styles: {
          ...settings.styles,
          qr: { ...settings.styles.qr, borderColor: "url(x)" },
        },
      }),
    ).rejects.toMatchObject({ status: 400, code: "OVERLAY_WIDGETS_INVALID" });
  });

  it("client แก้ตารางตรงไม่ได้ (RLS) อ่านได้แค่ของตัวเอง", async () => {
    const s = await createReadyStreamer("wrls");
    const client = await signedInClient(s.email);
    await client
      .from("overlay_widgets")
      .update({ goal_target_satang: 500 })
      .eq("user_id", s.id);
    expect((await getOverlayWidgetSettings(s.id)).goalTargetSatang).toBe(
      100000,
    );
    const { data } = await client.from("overlay_widgets").select("user_id");
    expect(data).toEqual([{ user_id: s.id }]);
  });

  it("goal/top/recent นับเฉพาะ approved, ตัด Anonymous จากอันดับ, ไม่มีข้อมูลสลิป", async () => {
    const s = await createReadyStreamer("wdata");
    await adminClient()
      .from("payment_settings")
      .update({ allow_anonymous: true })
      .eq("user_id", s.id);
    await updateOverlayWidgetSettings(s.id, settings);
    const token = await tokenOf(s.id);

    await approved(s.username, "แมวส้ม", "100");
    await approved(s.username, "หมี", "30");
    await approved(s.username, "แมวส้ม", "50");
    await approved(s.username, "ใครก็ได้", "500", { anonymous: true });
    // ยังไม่จ่าย ไม่นับ
    await createDonation(
      s.username,
      { donorName: "ยังไม่จ่าย", amount: "999" },
      ip(),
    );

    expect(await getWidgetData(token, "goal")).toEqual({
      title: "ซื้อไมค์ใหม่",
      targetSatang: 100000,
      currentSatang: 68000,
      style: settings.styles.goal,
    });
    expect(await getWidgetData(token, "top")).toMatchObject({
      period: "all",
      items: [
        { name: "แมวส้ม", totalSatang: 15000 },
        { name: "หมี", totalSatang: 3000 },
      ],
    });
    const recent = await getWidgetData(token, "recent");
    expect(recent.items.map((i) => [i.name, i.amountSatang])).toEqual([
      ["Anonymous", 50000],
      ["แมวส้ม", 5000],
      ["หมี", 3000],
    ]);
    const qr = await getWidgetData(token, "qr");
    expect(qr).toMatchObject({
      caption: "สแกนเลย",
      donateUrl: expect.stringMatching(new RegExp(`/${s.username}$`)),
    });

    // ห้ามมีชื่อจริงผู้โอน/ข้อมูลบัญชีจากสลิป
    const all = JSON.stringify([
      await getWidgetData(token, "goal"),
      await getWidgetData(token, "top"),
      recent,
      qr,
    ]);
    for (const secret of [
      "ผู้โอน",
      "REAL SENDER",
      "สมชาย",
      "SOMCHAI",
      "0812345678",
    ]) {
      expect(all).not.toContain(secret);
    }
  });

  it("เริ่มนับ goal ใหม่ → ยอดกลับเป็น 0", async () => {
    const s = await createReadyStreamer("wreset");
    const token = await tokenOf(s.id);
    await approved(s.username, "แมวส้ม", "100");
    expect((await getWidgetData(token, "goal")).currentSatang).toBe(10000);
    await resetGoal(s.id);
    expect((await getWidgetData(token, "goal")).currentSatang).toBe(0);
  });

  it("token ผิด → 404", async () => {
    await expect(getWidgetData("x".repeat(43), "goal")).rejects.toMatchObject({
      status: 404,
      code: "OVERLAY_NOT_FOUND",
    });
    await expect(getWidgetData("bad", "top")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("Subathon timer", () => {
  it("ครั้งแรก 01:00:00 → เริ่ม → โดเนทผ่านเพิ่มเวลา (พร้อมกัน 2 รายการครบ) → test alert ไม่เพิ่ม", async () => {
    const s = await createReadyStreamer("tmr");
    expect(await getTimer(s.id)).toMatchObject({
      status: "idle",
      remainingSec: 3600,
      label: "Subathon",
    });
    // ยังไม่เริ่ม: โดเนทไม่เพิ่มเวลา
    await approved(s.username, "แมว", "100");
    expect((await getTimer(s.id)).remainingSec).toBe(3600);

    const started = await controlTimer(s.id, { action: "start" });
    expect(started.status).toBe("running");
    expect(started.remainingSec).toBeGreaterThan(3595);

    await Promise.all([
      approved(s.username, "แมว", "100"), // +600
      approved(s.username, "หมี", "25"), // +150
    ]);
    const t = await getTimer(s.id);
    expect(t.remainingSec).toBeGreaterThan(3600 + 750 - 10);
    expect(t.remainingSec).toBeLessThanOrEqual(3600 + 750);

    await sendTestAlert(s.id);
    expect((await getTimer(s.id)).remainingSec).toBeLessThanOrEqual(
      t.remainingSec,
    );
  });

  it("พัก → เวลาไม่ลด + โดเนทยังเพิ่ม → นับต่อ / ปรับเวลา / รีเซ็ต", async () => {
    const s = await createReadyStreamer("tmr2");
    await controlTimer(s.id, { action: "start" });
    const paused = await controlTimer(s.id, { action: "pause" });
    expect(paused.status).toBe("paused");
    await new Promise((r) => setTimeout(r, 1200));
    expect((await getTimer(s.id)).remainingSec).toBe(paused.remainingSec);

    await approved(s.username, "แมว", "20"); // +120
    expect((await getTimer(s.id)).remainingSec).toBe(paused.remainingSec + 120);

    const adjusted = await controlTimer(s.id, {
      action: "adjust",
      seconds: -300,
    });
    expect(adjusted.remainingSec).toBe(paused.remainingSec + 120 - 300);

    await expect(controlTimer(s.id, { action: "start" })).rejects.toMatchObject(
      {
        status: 409,
        code: "TIMER_INVALID_STATE",
      },
    );
    expect((await controlTimer(s.id, { action: "resume" })).status).toBe(
      "running",
    );
    const reset = await controlTimer(s.id, { action: "reset" });
    expect(reset).toMatchObject({ status: "idle", remainingSec: 3600 });
  });

  it("หมดเวลาแล้วโดเนทไม่เพิ่ม", async () => {
    const s = await createReadyStreamer("tmr3");
    await controlTimer(s.id, { action: "start" });
    await adminClient()
      .from("overlay_widgets")
      .update({ timer_ends_at: new Date(Date.now() - 1000).toISOString() })
      .eq("user_id", s.id);
    expect((await getTimer(s.id)).status).toBe("ended");
    await approved(s.username, "แมว", "100");
    expect(await getTimer(s.id)).toMatchObject({
      status: "ended",
      remainingSec: 0,
    });
  });

  it("client เรียก SQL function ตรงไม่ได้ + คำสั่งผิด 400", async () => {
    const s = await createReadyStreamer("tmr4");
    const client = await signedInClient(s.email);
    const { error } = await client.rpc("subathon_add_seconds", {
      p_user: s.id,
      p_seconds: 99999,
    });
    expect(error).not.toBeNull();
    const { error: applyError } = await client.rpc("subathon_apply_donation", {
      p_donation: crypto.randomUUID(),
      p_seconds: 99999,
    });
    expect(applyError).not.toBeNull();
    expect((await getTimer(s.id)).remainingSec).toBe(3600);
    await expect(controlTimer(s.id, { action: "warp" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("คนดูเลือกลดเวลา: ปิดอยู่ถูกบังคับเป็นเพิ่ม · เปิดแล้วลด · ลดจนหมดเวลา", async () => {
    const s = await createReadyStreamer("tmr5");
    await controlTimer(s.id, { action: "start" });
    const forced = await approved(s.username, "แมว", "100", {
      timerDirection: "subtract",
    });
    expect((await getDonationDetail(s.id, forced)).timer).toMatchObject({
      direction: "add",
      appliedSec: 600,
    });

    await updateOverlayWidgetSettings(s.id, {
      ...settings,
      timerAllowSubtract: true,
    });
    const before = (await getTimer(s.id)).remainingSec;
    const sub = await approved(s.username, "หมี", "50", {
      timerDirection: "subtract",
    });
    const after = (await getTimer(s.id)).remainingSec;
    expect(after).toBeLessThanOrEqual(before - 300);
    expect(after).toBeGreaterThan(before - 300 - 5);
    expect((await getDonationDetail(s.id, sub)).timer).toMatchObject({
      direction: "subtract",
      seconds: -300,
      appliedSec: -300,
      canApply: false,
    });

    // ลดเกินเวลาที่เหลือ → 0 = หมดเวลา, บันทึกเท่าที่ลดได้จริง
    const big = await approved(s.username, "หมี", "1000", {
      timerDirection: "subtract",
    });
    expect((await getTimer(s.id)).status).toBe("ended");
    const applied = (await getDonationDetail(s.id, big)).timer!.appliedSec!;
    expect(applied).toBeLessThan(0);
    expect(applied).toBeGreaterThan(-6000);
  });

  it("โหมดกดเอง: โดเนทไม่แตะ timer → กดใช้ครั้งเดียว", async () => {
    const s = await createReadyStreamer("tmr6");
    await updateOverlayWidgetSettings(s.id, {
      ...settings,
      timerMode: "manual",
      timerAllowSubtract: true,
    });
    const id = await approved(s.username, "แมว", "20", {
      timerDirection: "subtract",
    });
    // ยังไม่เริ่ม → ใช้ไม่ได้
    await expect(applyDonationTimer(s.id, id)).rejects.toMatchObject({
      status: 409,
      code: "TIMER_INVALID_STATE",
    });

    await controlTimer(s.id, { action: "start" });
    await controlTimer(s.id, { action: "pause" });
    const paused = (await getTimer(s.id)).remainingSec;
    const id2 = await approved(s.username, "หมี", "30", {
      timerDirection: "subtract",
    });
    expect((await getTimer(s.id)).remainingSec).toBe(paused);
    expect((await getDonationDetail(s.id, id2)).timer).toMatchObject({
      seconds: -180,
      appliedSec: null,
      canApply: true,
    });

    const detail = await applyDonationTimer(s.id, id2);
    expect(detail.timer).toMatchObject({ appliedSec: -180, canApply: false });
    expect((await getTimer(s.id)).remainingSec).toBe(paused - 180);
    await expect(applyDonationTimer(s.id, id2)).rejects.toMatchObject({
      status: 409,
      code: "TIMER_ALREADY_APPLIED",
    });

    // ไม่ใช่เจ้าของ → 404
    const other = await createReadyStreamer("tmr7");
    await expect(applyDonationTimer(other.id, id)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("เมนู Subathon: เฉพาะโดเนทของรอบนี้ · ใช้ทั้งหมดครั้งเดียว · auto ไม่มีรายการรอ", async () => {
    const s = await createReadyStreamer("tmr8");
    await updateOverlayWidgetSettings(s.id, {
      ...settings,
      timerMode: "manual",
      timerAllowSubtract: true,
    });
    await approved(s.username, "ก่อนเริ่ม", "50");
    expect((await listRoundDonations(s.id)).items).toHaveLength(0);

    await controlTimer(s.id, { action: "start" });
    await controlTimer(s.id, { action: "pause" });
    const paused = (await getTimer(s.id)).remainingSec;
    await approved(s.username, "แมว", "100"); // +600
    await approved(s.username, "หมี", "30", { timerDirection: "subtract" }); // -180

    const round = await listRoundDonations(s.id, "pending");
    expect(round.items.map((d) => d.donorName)).toEqual(["หมี", "แมว"]);
    expect(round).toMatchObject({ pendingCount: 2, pendingTotalSec: 420 });

    const result = await applyAllRoundDonations(s.id);
    expect(result).toMatchObject({ applied: 2, totalSec: 420 });
    expect(result.timer.remainingSec).toBe(paused + 420);
    expect(await applyAllRoundDonations(s.id)).toMatchObject({ applied: 0 });
    expect((await listRoundDonations(s.id)).pendingCount).toBe(0);

    await updateOverlayWidgetSettings(s.id, { ...settings, timerMode: "auto" });
    await approved(s.username, "นก", "20");
    const auto = await listRoundDonations(s.id);
    expect(auto.pendingCount).toBe(0);
    expect(auto.items).toHaveLength(3);
  });
});

describe("Avatar", () => {
  const png = () =>
    new File([readFileSync("public/logo-mark.png")], "a.png", {
      type: "image/png",
    });
  const exists = async (path: string) => {
    const [dir, name] = [path.split("/")[0], path.split("/")[1]];
    const { data } = await adminClient()
      .storage.from("alert-media")
      .list(dir, { search: name });
    return (data ?? []).some((f) => f.name === name);
  };
  const pathOf = async (userId: string) =>
    (
      await adminClient()
        .from("overlay_widgets")
        .select("avatar_idle_path, avatar_speak_path")
        .eq("user_id", userId)
        .single()
    ).data!;

  it("อัปโหลด idle/speak → widget data, เปลี่ยนรูปลบไฟล์เก่า, ไฟล์ปลอม 400, ลบรูป", async () => {
    const s = await createReadyStreamer("avatar");
    const token = await tokenOf(s.id);
    expect(await getWidgetData(token, "avatar")).toMatchObject({
      idleUrl: null,
      speakUrl: null,
      style: DEFAULT_STYLES.avatar,
    });

    const first = await uploadAvatarImage(s.id, "idle", png());
    expect(first.avatarIdleUrl).toMatch(/avatar-idle-.+\.png$/);
    const firstPath = (await pathOf(s.id)).avatar_idle_path!;
    expect(firstPath.startsWith(`${s.id}/avatar-idle-`)).toBe(true);
    await uploadAvatarImage(s.id, "speak", png());

    await uploadAvatarImage(s.id, "idle", png());
    expect(await exists(firstPath)).toBe(false);
    const data = await getWidgetData(token, "avatar");
    expect(data.idleUrl).not.toBe(first.avatarIdleUrl);
    expect(data.speakUrl).toMatch(/avatar-speak-/);

    await expect(
      uploadAvatarImage(s.id, "idle", new File(["<svg/>"], "x.png")),
    ).rejects.toMatchObject({ status: 400, code: "MEDIA_INVALID" });

    const speakPath = (await pathOf(s.id)).avatar_speak_path!;
    const removed = await removeAvatarImage(s.id, "speak");
    expect(removed.avatarSpeakUrl).toBeNull();
    expect(await exists(speakPath)).toBe(false);
  });
});

import { afterEach, describe, expect, it } from "vitest";

import { subscribeAsOverlay } from "../../../test/realtime";
import { fakeSlipPayload, goodSlip, slipFile } from "../../../test/slip";
import { createReadyStreamer } from "../../../test/streamer";
import { adminClient, signedInClient } from "../../../test/supabase";
import { overlayChannelName } from "../realtime/overlay";
import { createDonation } from "./donation";
import {
  getOverlayWidgetSettings,
  getWidgetData,
  resetGoal,
  updateOverlayWidgetSettings,
} from "./overlay-widgets";
import { verifySlip } from "./slip";
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
  opts: { anonymous?: boolean } = {},
) {
  const d = await createDonation(
    username,
    { donorName, amount, anonymous: opts.anonymous },
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

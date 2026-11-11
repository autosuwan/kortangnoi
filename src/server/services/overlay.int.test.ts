import { afterEach, describe, expect, it } from "vitest";

import { subscribeAsOverlay } from "../../../test/realtime";
import { adminClient, createTestUser } from "../../../test/supabase";
import { overlayChannelName } from "../realtime/overlay";

import { updateAlertSettings } from "./alert";
import {
  getOverlayByToken,
  regenerateOverlayToken,
  sendTestAlert,
} from "./overlay";

const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((c) => c()));
});

async function tokenOf(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", userId)
    .single();
  return data!.overlay_token;
}

describe("overlay service", () => {
  it("token ถูก → ได้ channel + ค่า alert, token ผิด → 404", async () => {
    const user = await createTestUser("ov-get");
    const token = await tokenOf(user.id);
    const config = await getOverlayByToken(token);
    expect(config.channel).toBe(overlayChannelName(token));
    expect(config.channel).not.toContain(token);
    expect(config.settings).toMatchObject({
      durationSec: 8,
      supportText: "โดเนท",
    });
    expect(config.settings).not.toHaveProperty("donorCanPickImage");

    for (const bad of ["nope", "a".repeat(43), "' or 1=1 --"]) {
      await expect(getOverlayByToken(bad)).rejects.toMatchObject({
        status: 404,
        code: "OVERLAY_NOT_FOUND",
      });
    }
  });

  it("ทดสอบ alert → overlay ได้รับ + จำกัด 1 ครั้ง/3 วินาที", async () => {
    const user = await createTestUser("ov-test");
    await updateAlertSettings(user.id, {
      durationSec: 8,
      soundEnabled: true,
      volume: 80,
      supportText: "ให้ค่าข้าว",
      nameColor: "#38BDF8",
      donorCanPickImage: false,
      donorCanPickColor: false,
      donorCanPickSupportText: false,
    });
    const overlay = await subscribeAsOverlay(
      overlayChannelName(await tokenOf(user.id)),
      ["donation"],
    );
    closers.push(overlay.close);
    expect(overlay.status).toBe("SUBSCRIBED");

    await sendTestAlert(user.id);
    await expect
      .poll(() => overlay.received, { timeout: 5000 })
      .toHaveLength(1);
    expect(overlay.received[0].payload).toMatchObject({
      donorName: "ผู้ชมใจดี",
      amountSatang: 10000,
      isTest: true,
      supportText: "ให้ค่าข้าว",
      nameColor: "#38BDF8",
      imageUrl: "/alert-default.png",
    });

    await expect(sendTestAlert(user.id)).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
    });
  });

  it("สร้างลิงก์ใหม่ → token เก่าใช้ไม่ได้ + overlay เก่าได้ revoked", async () => {
    const user = await createTestUser("ov-regen");
    const oldToken = await tokenOf(user.id);
    const overlay = await subscribeAsOverlay(overlayChannelName(oldToken), [
      "revoked",
    ]);
    closers.push(overlay.close);

    const { overlayUrl } = await regenerateOverlayToken(user.id);
    const newToken = overlayUrl.split("/overlay/")[1];
    expect(newToken).not.toBe(oldToken);
    expect(newToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    await expect(getOverlayByToken(oldToken)).rejects.toMatchObject({
      status: 404,
    });
    await expect(getOverlayByToken(newToken)).resolves.toBeTruthy();
    await expect
      .poll(() => overlay.received.map((r) => r.event), { timeout: 5000 })
      .toEqual(["revoked"]);
  });

  it("บันทึกค่า alert → overlay ได้ event settings", async () => {
    const user = await createTestUser("ov-settings");
    const overlay = await subscribeAsOverlay(
      overlayChannelName(await tokenOf(user.id)),
      ["settings"],
    );
    closers.push(overlay.close);
    await updateAlertSettings(user.id, {
      durationSec: 5,
      soundEnabled: true,
      volume: 80,
      supportText: "โดเนท",
      nameColor: "#FACC15",
      donorCanPickImage: false,
      donorCanPickColor: false,
      donorCanPickSupportText: false,
    });
    await expect.poll(() => overlay.received.length, { timeout: 5000 }).toBe(1);
  });
});

import { randomUUID } from "node:crypto";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  signedInClient,
} from "../../../test/supabase";

/**
 * พิสูจน์ว่า overlay (anon) "รับ" alert ได้ แต่ "ส่ง" alert ปลอมเข้า channel ไม่ได้
 * — เป็นเหตุผลที่ใช้ private channel + policy บน realtime.messages
 */
const opened: { close: () => Promise<unknown> }[] = [];
afterEach(async () => {
  await Promise.all(opened.splice(0).map((c) => c.close()));
});

async function subscribeAsOverlay(topic: string) {
  const client = anonClient();
  await client.realtime.setAuth();
  const received: unknown[] = [];
  const channel = client
    .channel(topic, { config: { private: true } })
    .on("broadcast", { event: "donation" }, ({ payload }) => {
      received.push(payload);
    });
  const status = await new Promise<string>((resolve) =>
    channel.subscribe((s) => {
      if (s !== "CLOSED") resolve(s);
    }),
  );
  opened.push({ close: () => client.removeChannel(channel) });
  return { status, received, channel };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("overlay realtime channel", () => {
  it("anon รับ broadcast จาก server ได้", async () => {
    const topic = `overlay:${randomUUID().replace(/-/g, "")}`;
    const overlay = await subscribeAsOverlay(topic);
    expect(overlay.status).toBe("SUBSCRIBED");

    const server = adminClient().channel(topic, { config: { private: true } });
    const res = await server.httpSend("donation", { donationId: "real" });
    expect(res.success).toBe(true);

    await expect
      .poll(() => overlay.received, { timeout: 5000 })
      .toEqual([{ donationId: "real" }]);
  });

  it("anon ส่ง alert ปลอมเข้า channel ไม่ได้ (ทั้ง private และ public ชื่อเดียวกัน)", async () => {
    const topic = `overlay:${randomUUID().replace(/-/g, "")}`;
    const overlay = await subscribeAsOverlay(topic);
    expect(overlay.status).toBe("SUBSCRIBED");

    // ผู้ไม่หวังดีรู้ชื่อ channel (เช่น ลิงก์หลุด) แล้วลองส่งเอง
    const attacker = anonClient();
    await attacker.realtime.setAuth();
    const privateSend = await attacker
      .channel(topic, { config: { private: true } })
      .httpSend("donation", { donationId: "fake-private" })
      .catch((e: Error) => ({ success: false, error: e.message }));
    expect(privateSend.success).toBe(false);

    // ผู้ใช้ที่ล็อกอิน (authenticated) ก็ส่งไม่ได้
    const user = await createTestUser("rt-attacker");
    const loggedIn = await signedInClient(user.email);
    await loggedIn.realtime.setAuth();
    const authedSend = await loggedIn
      .channel(topic, { config: { private: true } })
      .httpSend("donation", { donationId: "fake-authed" })
      .catch((e: Error) => ({ success: false, error: e.message }));
    expect(authedSend.success).toBe(false);

    // ลองผ่าน websocket channel แบบ public ชื่อเดียวกัน
    const pub: RealtimeChannel = attacker.channel(topic, {
      config: { private: false },
    });
    await new Promise<void>((resolve) =>
      pub.subscribe((s) => {
        if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR") resolve();
      }),
    );
    await pub.send({
      type: "broadcast",
      event: "donation",
      payload: { donationId: "fake-public" },
    });
    opened.push({ close: () => attacker.removeChannel(pub) });

    await wait(1500);
    expect(overlay.received).toEqual([]);
  });
});

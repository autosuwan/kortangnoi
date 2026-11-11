import { createHash, randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildPromptpayPayload } from "@/lib/promptpay";
import { createReadyStreamer } from "../../../test/streamer";
import {
  adminClient,
  anonClient,
  signedInClient,
} from "../../../test/supabase";

import {
  createDonation,
  getDonationForDonor,
  getPublicStreamer,
} from "./donation";

const body = { donorName: "ผู้ชม", amount: "50", message: "สู้ๆ" };
const ip = () =>
  `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

describe("หน้าโดเนท", () => {
  it("ข้อมูลสาธารณะของสตรีมเมอร์ ไม่มีเลขพร้อมเพย์", async () => {
    const s = await createReadyStreamer("pub");
    const pub = await getPublicStreamer(s.username.toUpperCase());
    expect(pub).toMatchObject({
      username: s.username,
      enabled: true,
      minAmountSatang: 2000,
      accountName: "สมชาย ใจดี",
    });
    expect(JSON.stringify(pub)).not.toContain("0812345678");
    expect(await getPublicStreamer("no-such-user-x")).toBeNull();
  });

  it("สร้างรายการ: QR ล็อกยอด, token เก็บเป็น hash, snapshot ผู้รับ", async () => {
    const s = await createReadyStreamer("create");
    const created = await createDonation(s.username, body, ip());
    expect(created.amountSatang).toBe(5000);
    expect(created.qrPayload).toBe(
      buildPromptpayPayload({
        type: "phone",
        id: "0812345678",
        amountSatang: 5000,
      }),
    );
    expect(created.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { data } = await adminClient()
      .from("donations")
      .select("*")
      .eq("id", created.donationId)
      .single();
    expect(data).toMatchObject({
      streamer_id: s.id,
      status: "awaiting_slip",
      donor_name: "ผู้ชม",
      message: "สู้ๆ",
      amount_satang: 5000,
      access_token_hash: createHash("sha256")
        .update(created.accessToken)
        .digest("hex"),
      receiver_snapshot: {
        promptpayId: "0812345678",
        accountNameTh: "สมชาย ใจดี",
      },
    });
    expect(JSON.stringify(data)).not.toContain(created.accessToken);
    expect(data!.ip_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    [{ amount: "19" }, 400, "AMOUNT_TOO_LOW"],
    [{ amount: "100001" }, 400, "AMOUNT_INVALID"],
    [{ donorName: "" }, 400, "DONOR_NAME_INVALID"],
  ])("%o → %i %s", async (patch, status, code) => {
    const s = await createReadyStreamer("invalid");
    await expect(
      createDonation(s.username, { ...body, ...patch }, ip()),
    ).rejects.toMatchObject({ status, code });
  });

  it("ปิดรับโดเนท → 409, ไม่มี username → 404", async () => {
    const s = await createReadyStreamer("closed", { enabled: false });
    await expect(createDonation(s.username, body, ip())).rejects.toMatchObject({
      status: 409,
      code: "DONATIONS_DISABLED",
    });
    await expect(
      createDonation("nobody-here-x", body, ip()),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rate limit 10 รายการ / 10 นาที / IP / สตรีมเมอร์", async () => {
    const s = await createReadyStreamer("rate");
    const sameIp = ip();
    for (let i = 0; i < 10; i++) await createDonation(s.username, body, sameIp);
    await expect(
      createDonation(s.username, body, sameIp),
    ).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
    });
    await expect(createDonation(s.username, body, ip())).resolves.toBeTruthy();
    // IP เดิมโดเนทให้สตรีมเมอร์คนอื่นได้
    const other = await createReadyStreamer("rate-other");
    await expect(
      createDonation(other.username, body, sameIp),
    ).resolves.toBeTruthy();
  });

  it("หน้าตา alert ของผู้บริจาค เก็บเฉพาะส่วนที่สตรีมเมอร์เปิด", async () => {
    const s = await createReadyStreamer("style");
    await adminClient()
      .from("alert_settings")
      .update({ donor_can_pick_color: true })
      .eq("user_id", s.id);
    const created = await createDonation(
      s.username,
      {
        ...body,
        alertStyle: {
          nameColor: "#38bdf8",
          supportText: "ให้ค่าขนม",
          mediaUrl: "https://static.klipy.com/ii/a.gif",
        },
      },
      ip(),
    );
    const { data } = await adminClient()
      .from("donations")
      .select("donor_name_color, donor_support_text, donor_media_url")
      .eq("id", created.donationId)
      .single();
    expect(data).toEqual({
      donor_name_color: "#38BDF8",
      donor_support_text: null,
      donor_media_url: null,
    });
  });
});

describe("ผู้บริจาคเปิดรายการ", () => {
  it("token ถูก → เห็นรายการ, token ผิด/id มั่ว → 404", async () => {
    const s = await createReadyStreamer("view");
    const c = await createDonation(s.username, body, ip());
    const view = await getDonationForDonor(c.donationId, c.accessToken);
    expect(view).toMatchObject({
      status: "awaiting_slip",
      amountSatang: 5000,
      attemptsLeft: 3,
      qrPayload: c.qrPayload,
      accountName: "สมชาย ใจดี",
      streamer: { username: s.username },
    });

    const wrong = "A".repeat(43);
    for (const [id, t] of [
      [c.donationId, wrong],
      [randomUUID(), c.accessToken],
      ["not-a-uuid", c.accessToken],
    ]) {
      await expect(getDonationForDonor(id, t)).rejects.toMatchObject({
        status: 404,
      });
    }
  });

  it("เลย 30 นาที → expired", async () => {
    const s = await createReadyStreamer("expire");
    const c = await createDonation(s.username, body, ip());
    await adminClient()
      .from("donations")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", c.donationId);
    const view = await getDonationForDonor(c.donationId, c.accessToken);
    expect(view.status).toBe("expired");
  });
});

describe("สิทธิ์ตาราง donations", () => {
  it("anon และสตรีมเมอร์คนอื่นอ่านไม่ได้, เจ้าของอ่านได้แต่แก้ไม่ได้", async () => {
    const s = await createReadyStreamer("rls-owner");
    const other = await createReadyStreamer("rls-other");
    const c = await createDonation(s.username, body, ip());

    const anon = await anonClient()
      .from("donations")
      .select("id")
      .eq("id", c.donationId);
    expect(anon.data ?? []).toEqual([]);

    const otherClient = await signedInClient(other.email);
    const fromOther = await otherClient
      .from("donations")
      .select("id")
      .eq("id", c.donationId);
    expect(fromOther.data).toEqual([]);

    const owner = await signedInClient(s.email);
    const mine = await owner
      .from("donations")
      .select("id")
      .eq("id", c.donationId);
    expect(mine.data).toEqual([{ id: c.donationId }]);

    const update = await owner
      .from("donations")
      .update({ status: "approved" })
      .eq("id", c.donationId);
    expect(update.error?.code).toBe("42501");
  });
});

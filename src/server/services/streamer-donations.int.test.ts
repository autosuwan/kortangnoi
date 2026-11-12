import { afterEach, describe, expect, it } from "vitest";

import { subscribeAsOverlay } from "../../../test/realtime";
import { fakeSlipPayload, goodSlip, slipFile } from "../../../test/slip";
import { createReadyStreamer } from "../../../test/streamer";
import { adminClient } from "../../../test/supabase";
import { overlayChannelName } from "../realtime/overlay";
import { replayDonationAlert } from "./overlay";

import { createDonation } from "./donation";
import { verifySlip } from "./slip";
import {
  approveDonation,
  getDonationDetail,
  getDonationSummary,
  listDonations,
  rejectDonation,
} from "./streamer-donations";

const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((c) => c()));
});
const ip = () =>
  `10.7.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

/** สร้างโดเนทที่แนบสลิปยอดไม่ตรง → pending_review */
async function pendingDonation(username: string, amount = "50") {
  const d = await createDonation(
    username,
    { donorName: "ผู้ชมใจดี", amount, message: "สู้ๆ" },
    ip(),
  );
  const satang = Math.round(Number(amount) * 100);
  const r = await verifySlip(
    d.donationId,
    d.accessToken,
    await slipFile(fakeSlipPayload({ data: goodSlip(satang - 100) })),
  );
  expect(r.status).toBe("pending_review");
  return d.donationId;
}

async function approvedDonation(username: string, amount: string) {
  const d = await createDonation(username, { donorName: "ผู้ชม", amount }, ip());
  const satang = Math.round(Number(amount) * 100);
  await verifySlip(
    d.donationId,
    d.accessToken,
    await slipFile(fakeSlipPayload({ data: goodSlip(satang) })),
  );
  return d.donationId;
}

describe("ประวัติโดเนท (F5)", () => {
  it("รายการ + ตัวกรอง + ไม่รวมรายการที่ยังไม่จ่ายเป็นค่าเริ่มต้น", async () => {
    const s = await createReadyStreamer("hist");
    const pending = await pendingDonation(s.username);
    const approved = await approvedDonation(s.username, "100");
    await createDonation(
      s.username,
      { donorName: "ยังไม่จ่าย", amount: "20" },
      ip(),
    );

    const all = await listDonations(s.id);
    expect(all.items.map((i) => i.id).sort()).toEqual(
      [pending, approved].sort(),
    );
    expect(all.total).toBe(2);

    const onlyPending = await listDonations(s.id, { filter: "pending_review" });
    expect(onlyPending.items.map((i) => i.id)).toEqual([pending]);

    const unpaid = await listDonations(s.id, { filter: "unpaid" });
    expect(unpaid.items.map((i) => i.donorName)).toEqual(["ยังไม่จ่าย"]);
  });

  it("ยอดรวมวันนี้/เดือนนี้นับเฉพาะ approved ตามเวลาไทย", async () => {
    const s = await createReadyStreamer("sum");
    await approvedDonation(s.username, "100");
    const old = await approvedDonation(s.username, "30");
    await pendingDonation(s.username, "50");
    // ย้ายรายการหนึ่งไปเมื่อวาน (ยังอยู่เดือนนี้ไม่ได้แน่นอนทุกวัน → ตั้งเวลาวิเคราะห์เอง)
    const now = new Date("2026-11-15T05:00:00Z"); // 12:00 น. ไทย วันที่ 15
    await adminClient()
      .from("donations")
      .update({ created_at: "2026-11-15T01:00:00Z" }) // วันนี้ (ไทย)
      .eq("streamer_id", s.id)
      .neq("id", old);
    await adminClient()
      .from("donations")
      .update({ created_at: "2026-11-14T16:30:00Z" }) // 23:30 น. ไทยวันที่ 14
      .eq("id", old);

    expect(await getDonationSummary(s.id, now)).toEqual({
      todaySatang: 10000,
      monthSatang: 13000,
      pendingCount: 1,
    });
  });

  it("รายละเอียด: signed URL รูปสลิป + ชื่อจริงผู้โอน + เหตุผล; คนอื่นดูไม่ได้", async () => {
    const s = await createReadyStreamer("detail");
    const other = await createReadyStreamer("detail-other");
    const id = await pendingDonation(s.username);

    const detail = await getDonationDetail(s.id, id);
    expect(detail).toMatchObject({
      status: "pending_review",
      donorName: "ผู้ชมใจดี",
      reasons: ["ยอดในสลิปไม่ตรงกับที่กรอก"],
      slip: { senderName: "นาย ผู้โอน จริงจริง", amountSatang: 4900 },
    });
    expect(detail.slipUrl).toMatch(/\/storage\/v1\/object\/sign\/slips\//);
    expect((await fetch(detail.slipUrl!)).status).toBe(200);

    await expect(getDonationDetail(other.id, id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(getDonationDetail(s.id, "not-a-uuid")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("อนุมัติ/ปฏิเสธ (F6)", () => {
  it("อนุมัติ → approved (manual) + alert ขึ้น overlay ครั้งเดียว แม้กดพร้อมกัน", async () => {
    const s = await createReadyStreamer("approve");
    const id = await pendingDonation(s.username);
    const { data } = await adminClient()
      .from("profiles")
      .select("overlay_token")
      .eq("id", s.id)
      .single();
    const overlay = await subscribeAsOverlay(
      overlayChannelName(data!.overlay_token),
      ["donation"],
    );
    closers.push(overlay.close);

    const results = await Promise.allSettled([
      approveDonation(s.id, id),
      approveDonation(s.id, id),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected");
    expect((failed as PromiseRejectedResult).reason).toMatchObject({
      status: 409,
      code: "INVALID_STATUS",
    });

    const detail = await getDonationDetail(s.id, id);
    expect(detail).toMatchObject({ status: "approved", approvedVia: "manual" });
    expect(detail.reviewedAt).toBeTruthy();

    await expect.poll(() => overlay.received.length, { timeout: 5000 }).toBe(1);
    await new Promise((r) => setTimeout(r, 500));
    expect(overlay.received).toHaveLength(1);
    expect(JSON.stringify(overlay.received[0].payload)).not.toContain("ผู้โอน");
  });

  it("ปฏิเสธพร้อมเหตุผล → ผู้บริจาคเห็นเหตุผล; ปฏิเสธซ้ำ → 409", async () => {
    const s = await createReadyStreamer("reject");
    const id = await pendingDonation(s.username);
    const detail = await rejectDonation(s.id, id, { reason: "ยอดไม่ครบ" });
    expect(detail).toMatchObject({
      status: "rejected",
      reviewNote: "ยอดไม่ครบ",
      resultMessage: "สตรีมเมอร์ไม่อนุมัติ: ยอดไม่ครบ",
    });
    await expect(rejectDonation(s.id, id, {})).rejects.toMatchObject({
      status: 409,
    });
  });

  it("คนอื่นอนุมัติไม่ได้ (404)", async () => {
    const s = await createReadyStreamer("approve-own");
    const other = await createReadyStreamer("approve-other");
    const id = await pendingDonation(s.username);
    await expect(approveDonation(other.id, id)).rejects.toMatchObject({
      status: 404,
    });
    expect((await getDonationDetail(s.id, id)).status).toBe("pending_review");
  });
});

describe("แสดง alert ซ้ำ", () => {
  it("รายการที่ผ่านแล้ว → overlay ได้ alert ใหม่ (id ไม่ซ้ำ); กดรัว → 429; ยังไม่ผ่าน → 409; คนอื่น → 404", async () => {
    const s = await createReadyStreamer("replay");
    const other = await createReadyStreamer("replay-other");
    const approved = await approvedDonation(s.username, "100");
    const pending = await pendingDonation(s.username);
    const { data } = await adminClient()
      .from("profiles")
      .select("overlay_token")
      .eq("id", s.id)
      .single();
    const overlay = await subscribeAsOverlay(
      overlayChannelName(data!.overlay_token),
      ["donation"],
    );
    closers.push(overlay.close);

    await replayDonationAlert(s.id, approved);
    await expect.poll(() => overlay.received.length, { timeout: 5000 }).toBe(1);
    const alert = overlay.received[0].payload as {
      donationId: string;
      donorName: string;
    };
    expect(alert.donationId).toMatch(
      new RegExp(`^${approved}:replay:[0-9a-f]{8}$`),
    );
    expect(alert.donorName).toBe("ผู้ชม");

    await expect(replayDonationAlert(s.id, approved)).rejects.toMatchObject({
      status: 429,
    });
    await expect(replayDonationAlert(s.id, pending)).rejects.toMatchObject({
      status: 409,
    });
    await expect(replayDonationAlert(other.id, approved)).rejects.toMatchObject(
      { status: 404 },
    );
  });
});

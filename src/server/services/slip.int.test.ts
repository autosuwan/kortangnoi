import { afterEach, describe, expect, it } from "vitest";

import type { OverlayAlert } from "@/lib/overlay";
import { subscribeAsOverlay } from "../../../test/realtime";
import { fakeSlipPayload, goodSlip, slipFile } from "../../../test/slip";
import { createReadyStreamer } from "../../../test/streamer";
import { adminClient } from "../../../test/supabase";
import { overlayChannelName } from "../realtime/overlay";

import { createDonation, getDonationForDonor } from "./donation";
import { verifySlip } from "./slip";

// SLIPOK_PROVIDER=fake — สลิปจำลองกำหนดผล SlipOK ผ่าน payload ใน QR
const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((c) => c()));
});

const ip = () =>
  `10.9.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

async function newDonation(name = "slip", amount = "50") {
  const s = await createReadyStreamer(name);
  const d = await createDonation(
    s.username,
    { donorName: "ผู้ชมใจดี", amount, message: "สู้ๆ" },
    ip(),
  );
  return { s, d };
}

async function row(id: string) {
  const { data } = await adminClient()
    .from("donations")
    .select("*")
    .eq("id", id)
    .single();
  return data!;
}

describe("แนบสลิป + ตรวจสลิป", () => {
  it("สลิปถูกต้อง → approved + alert ขึ้น overlay (ไม่มีชื่อจริงผู้โอน)", async () => {
    const { s, d } = await newDonation("slip-ok");
    const { data: profile } = await adminClient()
      .from("profiles")
      .select("overlay_token")
      .eq("id", s.id)
      .single();
    const overlay = await subscribeAsOverlay(
      overlayChannelName(profile!.overlay_token),
      ["donation"],
    );
    closers.push(overlay.close);

    const slip = goodSlip(5000);
    const result = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ data: slip })),
    );
    expect(result).toEqual({
      status: "approved",
      resultMessage: "ขอบคุณ! โดเนทของคุณขึ้นจอแล้ว",
      attemptsLeft: 0,
    });

    const r = await row(d.donationId);
    expect(r).toMatchObject({
      status: "approved",
      approved_via: "auto",
      trans_ref: slip.transRef,
      slip_attempts: 1,
    });
    expect(r.slip_storage_path).toBe(`${s.id}/${d.donationId}/1.png`);
    expect(r.slip_qr_hash).toMatch(/^[0-9a-f]{64}$/);

    await expect.poll(() => overlay.received.length, { timeout: 5000 }).toBe(1);
    const alert = overlay.received[0].payload as OverlayAlert;
    expect(alert).toMatchObject({
      donationId: d.donationId,
      donorName: "ผู้ชมใจดี",
      amountSatang: 5000,
      message: "สู้ๆ",
      isTest: false,
    });
    expect(JSON.stringify(alert)).not.toMatch(/ผู้โอน|REAL SENDER|สมชาย|5678/);
  });

  it("SlipOK ไม่รับข้อความ QR (1000) → ส่งไฟล์รูปแทนแล้วผ่าน", async () => {
    const { d } = await newDonation("slip-fallback");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(
        fakeSlipPayload({ data: goodSlip(5000), failDataMode: 1000 }),
      ),
    );
    expect(r.status).toBe("approved");
    expect((await row(d.donationId)).verify_result).toMatchObject({
      step: "decided",
      mode: "file",
    });
  });

  it("SlipOK ไม่รับทั้งข้อความและไฟล์ → บันทึกข้อมูลวิเคราะห์ (ความยาว/ต้น QR, ข้อความ SlipOK)", async () => {
    const { d } = await newDonation("slip-diag");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ code: 1000 })),
    );
    expect(r.status).toBe("pending_review");
    expect((await row(d.donationId)).verify_result).toMatchObject({
      step: "slipok",
      slipokCode: 1000,
      mode: "file",
      qr: { prefix: "TESTSL" },
    });
  });

  it("ไม่มี QR ในรูป → แนบใหม่ได้ เหลือ 2 ครั้ง", async () => {
    const { d } = await newDonation("slip-noqr");
    const blank = new File(
      [
        new Uint8Array(
          await (
            await import("sharp")
          )
            .default({
              create: {
                width: 300,
                height: 300,
                channels: 3,
                background: "#ffffff",
              },
            })
            .png()
            .toBuffer(),
        ),
      ],
      "blank.png",
    );
    const result = await verifySlip(d.donationId, d.accessToken, blank);
    expect(result).toMatchObject({ status: "awaiting_slip", attemptsLeft: 2 });
    expect(result.resultMessage).toContain("ไม่พบ QR");
  });

  it("แนบไม่ผ่าน 3 ครั้ง → rejected", async () => {
    const { d } = await newDonation("slip-3x");
    const notPayment = await slipFile("https://example.com/not-a-slip");
    const r1 = await verifySlip(d.donationId, d.accessToken, notPayment);
    const r2 = await verifySlip(d.donationId, d.accessToken, notPayment);
    const r3 = await verifySlip(d.donationId, d.accessToken, notPayment);
    expect([r1.status, r2.status, r3.status]).toEqual([
      "awaiting_slip",
      "awaiting_slip",
      "rejected",
    ]);
    expect(r3.resultMessage).toContain("แนบครบ 3 ครั้งแล้ว");
    await expect(
      verifySlip(d.donationId, d.accessToken, notPayment),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("สลิปเดียวกันใช้ซ้ำกับอีกรายการ → rejected (hash QR ซ้ำ ไม่เรียก SlipOK)", async () => {
    const { s, d } = await newDonation("slip-dup");
    const payload = fakeSlipPayload({ data: goodSlip(5000) });
    await verifySlip(d.donationId, d.accessToken, await slipFile(payload));

    const d2 = await createDonation(
      s.username,
      { donorName: "คนที่สอง", amount: "50" },
      ip(),
    );
    const r = await verifySlip(
      d2.donationId,
      d2.accessToken,
      await slipFile(payload),
    );
    expect(r).toMatchObject({
      status: "rejected",
      resultMessage: "สลิปนี้ถูกใช้ไปแล้ว",
    });
  });

  it("transRef ซ้ำ (QR ต่างกันแต่เป็นรายการโอนเดียวกัน) → rejected", async () => {
    const { s: streamer, d } = await newDonation("slip-ref");
    const slip = goodSlip(5000);
    await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ data: slip })),
    );
    const d2 = await createDonation(
      streamer.username,
      { donorName: "b", amount: "50" },
      ip(),
    );
    // payload ต่าง (hash QR ไม่ซ้ำ) แต่ transRef เดิม
    const sameRef = { ...slip, transTimestamp: new Date().toISOString() };
    const r = await verifySlip(
      d2.donationId,
      d2.accessToken,
      await slipFile(fakeSlipPayload({ data: sameRef })),
    );
    expect(r).toMatchObject({
      status: "rejected",
      resultMessage: "สลิปนี้ถูกใช้ไปแล้ว",
    });
    expect((await row(d2.donationId)).verify_result).toMatchObject({
      step: "duplicate_trans_ref",
    });
  });

  it("โอนให้คนอื่น → rejected", async () => {
    const { d } = await newDonation("slip-wrong");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(
        fakeSlipPayload({
          data: goodSlip(5000, {
            receiver: {
              displayName: "นาง สมหญิง ร",
              proxy: { type: "MSISDN", value: "xxx-xxx-9999" },
            },
          }),
        }),
      ),
    );
    expect(r).toMatchObject({
      status: "rejected",
      resultMessage: "สลิปนี้ไม่ได้โอนให้สตรีมเมอร์คนนี้",
    });
  });

  it("ยอดไม่ตรง → pending_review (เงินเข้าจริง ไม่ปฏิเสธ)", async () => {
    const { d } = await newDonation("slip-amount");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ data: goodSlip(4000) })),
    );
    expect(r.status).toBe("pending_review");
  });

  it("SlipOK 1010 (BBL/SCB รอ) → pending_review ไม่บันทึก system_errors", async () => {
    const { d } = await newDonation("slip-1010");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ code: 1010 })),
    );
    expect(r.status).toBe("pending_review");
  });

  it("SlipOK 1004 โควตาหมด → pending_review + system_errors ให้แอดมิน", async () => {
    const { d } = await newDonation("slip-1004");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ code: 1004 })),
    );
    expect(r.status).toBe("pending_review");
    const { data } = await adminClient()
      .from("system_errors")
      .select("source, code, context")
      .contains("context", { donationId: d.donationId });
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      source: "slipok",
      code: "1004",
      context: { donationId: d.donationId, mode: "data" },
    });
  });

  it("SlipOK 1011 (ไม่มีรายการจริง) → rejected", async () => {
    const { d } = await newDonation("slip-1011");
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ code: 1011 })),
    );
    expect(r.status).toBe("rejected");
  });

  it("ส่งพร้อมกัน 2 คำขอ → ตรวจได้คำขอเดียว อีกคำขอได้ 409", async () => {
    const { d } = await newDonation("slip-race");
    const file = await slipFile(fakeSlipPayload({ data: goodSlip(5000) }));
    const results = await Promise.allSettled([
      verifySlip(d.donationId, d.accessToken, file),
      verifySlip(d.donationId, d.accessToken, file),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const conflict = results.filter(
      (r) =>
        r.status === "rejected" &&
        (r.reason as { status?: number }).status === 409,
    );
    expect(ok).toHaveLength(1);
    expect(conflict).toHaveLength(1);
  });

  it("token ผิด → 404, ไฟล์ไม่ใช่รูป → 400 ไม่นับสิทธิ์", async () => {
    const { d } = await newDonation("slip-bad");
    const file = await slipFile(fakeSlipPayload({ data: goodSlip(5000) }));
    await expect(
      verifySlip(d.donationId, "A".repeat(43), file),
    ).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      verifySlip(d.donationId, d.accessToken, new File(["hello"], "x.png")),
    ).rejects.toMatchObject({ status: 400, code: "SLIP_FILE_INVALID" });
    expect((await row(d.donationId)).slip_attempts).toBe(0);
  });

  it("แนบหลังหมดเวลา QR (ภายใน 24 ชม.) → pending_review", async () => {
    const { d } = await newDonation("slip-late");
    await adminClient()
      .from("donations")
      .update({
        status: "expired",
        created_at: new Date(Date.now() - 40 * 60_000).toISOString(),
        expires_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      })
      .eq("id", d.donationId);
    const r = await verifySlip(
      d.donationId,
      d.accessToken,
      await slipFile(fakeSlipPayload({ data: goodSlip(5000) })),
    );
    expect(r).toMatchObject({
      status: "pending_review",
      resultMessage: "แนบสลิปหลังหมดเวลา ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
    });
  });

  it("กำลังตรวจอยู่ (ยังไม่ถึง 2 นาที) → ผู้บริจาคเห็น verifying และแนบซ้ำไม่ได้", async () => {
    const { d } = await newDonation("slip-verifying");
    await adminClient()
      .from("donations")
      .update({ status: "verifying" })
      .eq("id", d.donationId);
    const view = await getDonationForDonor(d.donationId, d.accessToken);
    expect(view.status).toBe("verifying");
    await expect(
      verifySlip(
        d.donationId,
        d.accessToken,
        await slipFile(fakeSlipPayload({ data: goodSlip(5000) })),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

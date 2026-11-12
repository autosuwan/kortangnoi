import { describe, expect, it } from "vitest";

import { fakeSlipPayload, goodSlip, slipFile } from "../../../test/slip";
import { createReadyStreamer } from "../../../test/streamer";
import { adminClient } from "../../../test/supabase";
import { getSlipOkQuota } from "../integrations/slipok";

import { getAdminStats } from "./admin";
import { createDonation } from "./donation";
import { verifySlip } from "./slip";

const ip = () =>
  `10.3.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

describe("หน้าแอดมิน", () => {
  it("นับสลิปที่ตรวจเดือนนี้ตามผล (ไม่นับรายการที่ยังไม่แนบสลิป) + error ล่าสุด", async () => {
    const before = await getAdminStats();
    const s = await createReadyStreamer("admin-stats");
    const make = async (slipSatang: number | null) => {
      const d = await createDonation(
        s.username,
        { donorName: "a", amount: "50" },
        ip(),
      );
      if (slipSatang !== null) {
        await verifySlip(
          d.donationId,
          d.accessToken,
          await slipFile(fakeSlipPayload({ data: goodSlip(slipSatang) })),
        );
      }
    };
    await make(5000); // approved
    await make(4000); // pending_review (ยอดไม่ตรง)
    await make(null); // ยังไม่แนบ — ไม่นับ
    await adminClient().from("system_errors").insert({
      source: "slipok",
      code: "1004",
      message: "quota exceeded (test)",
    });

    const after = await getAdminStats();
    expect(after.monthChecks.approved - before.monthChecks.approved).toBe(1);
    expect(
      after.monthChecks.pendingReview - before.monthChecks.pendingReview,
    ).toBe(1);
    expect(after.monthChecks.rejected - before.monthChecks.rejected).toBe(0);
    expect(after.recentErrors[0]).toMatchObject({
      source: "slipok",
      code: "1004",
      message: "quota exceeded (test)",
    });
  });

  it("โควตา SlipOK (fake) + cache", async () => {
    const q = await getSlipOkQuota();
    expect(q).toMatchObject({ quota: 87, endDate: "2026-12-31" });
    expect(await getSlipOkQuota()).toBe(q);
  });
});

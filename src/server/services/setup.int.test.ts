import { describe, expect, it } from "vitest";

import { createTestUser } from "../../../test/supabase";

import { getAlertSettings, updateAlertSettings } from "./alert";
import { sendTestAlert } from "./overlay";
import { updatePaymentSettings } from "./payment";
import { getSetupProgress, markSetupDone } from "./setup";

describe("setup progress", () => {
  it("ติ๊กตามที่ทำจริงทีละขั้น ข้ามขั้นได้", async () => {
    const user = await createTestUser("setup");
    expect(await getSetupProgress(user.id)).toEqual({
      done: [false, false, false],
      finished: false,
    });

    // ข้ามขั้น 1-2 ไปทดสอบ alert ก่อน → ติ๊กเฉพาะขั้น 3
    await sendTestAlert(user.id);
    expect((await getSetupProgress(user.id)).done).toEqual([
      false,
      false,
      true,
    ]);

    const { mediaType, mediaUrl, ...alert } = await getAlertSettings(user.id);
    void mediaType;
    void mediaUrl;
    await updateAlertSettings(user.id, { ...alert, durationSec: 10 });
    await updatePaymentSettings(user.id, {
      enabled: true,
      promptpayType: "phone",
      promptpayId: "0812345678",
      accountNameTh: "สมชาย ใจดี",
      accountNameEn: null,
      showAccountName: true,
      minAmountSatang: 2000,
      allowAnonymous: false,
    });
    expect((await getSetupProgress(user.id)).done).toEqual([true, true, true]);
  });

  it("กดเสร็จ/ซ่อนแล้ว finished = true (กดซ้ำได้)", async () => {
    const user = await createTestUser("setup-done");
    await markSetupDone(user.id);
    await markSetupDone(user.id);
    expect((await getSetupProgress(user.id)).finished).toBe(true);
  });
});

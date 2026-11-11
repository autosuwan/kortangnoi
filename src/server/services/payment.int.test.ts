import { describe, expect, it } from "vitest";

import { DEFAULT_PAYMENT_SETTINGS } from "@/lib/payment-settings";
import {
  adminClient,
  createTestUser,
  signedInClient,
} from "../../../test/supabase";

import { getPaymentSettings, updatePaymentSettings } from "./payment";

const filled = {
  ...DEFAULT_PAYMENT_SETTINGS,
  enabled: true,
  promptpayId: "081-234-5678",
  accountNameTh: "นาย สมชาย ใจดี",
  accountNameEn: "Somchai J.",
  minAmountSatang: 5000,
};

describe("payment settings service", () => {
  it("ค่าเริ่มต้นของผู้ใช้ใหม่", async () => {
    const user = await createTestUser("pay-default");
    expect(await getPaymentSettings(user.id)).toEqual(DEFAULT_PAYMENT_SETTINGS);
  });

  it("บันทึกแล้วอ่านกลับได้ค่าที่ normalize แล้ว", async () => {
    const user = await createTestUser("pay-update");
    const saved = await updatePaymentSettings(user.id, filled);
    expect(saved).toEqual({
      ...filled,
      promptpayId: "0812345678",
      accountNameTh: "สมชาย ใจดี",
      accountNameEn: "SOMCHAI J.",
    });
    expect(await getPaymentSettings(user.id)).toEqual(saved);
  });

  it("ข้อมูลไม่ครบแต่เปิดรับ → PAYMENT_INCOMPLETE", async () => {
    const user = await createTestUser("pay-incomplete");
    await expect(
      updatePaymentSettings(user.id, { ...filled, promptpayId: "" }),
    ).rejects.toMatchObject({ status: 400, code: "PAYMENT_INCOMPLETE" });
  });
});

describe("payment_settings ใน DB", () => {
  it("เจ้าของอ่านได้ แต่แก้ตรงผ่าน PostgREST ไม่ได้", async () => {
    const user = await createTestUser("pay-direct");
    const client = await signedInClient(user.email);

    const { data } = await client
      .from("payment_settings")
      .select("enabled")
      .eq("user_id", user.id)
      .single();
    expect(data).toEqual({ enabled: false });

    const { error } = await client
      .from("payment_settings")
      .update({ enabled: true })
      .eq("user_id", user.id);
    expect(error?.code).toBe("42501");
  });

  it("CHECK กันเปิดรับโดเนทโดยข้อมูลว่าง แม้ใช้ secret key", async () => {
    const user = await createTestUser("pay-check");
    const { error } = await adminClient()
      .from("payment_settings")
      .update({ enabled: true })
      .eq("user_id", user.id);
    expect(error?.code).toBe("23514");
  });
});

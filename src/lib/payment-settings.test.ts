import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAYMENT_SETTINGS,
  normalizeThaiName,
  validatePaymentSettings,
} from "./payment-settings";

const valid = {
  ...DEFAULT_PAYMENT_SETTINGS,
  enabled: true,
  promptpayId: "081-234-5678",
  accountNameTh: "นายสมชาย  ใจดี",
  accountNameEn: "somchai jaidee",
};

describe("validatePaymentSettings", () => {
  it("normalize ค่าก่อนเก็บ", () => {
    const result = validatePaymentSettings(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        ...valid,
        promptpayId: "0812345678",
        accountNameTh: "สมชาย ใจดี",
        accountNameEn: "SOMCHAI JAIDEE",
      },
    });
  });

  it("ชื่ออังกฤษว่าง → null", () => {
    const result = validatePaymentSettings({ ...valid, accountNameEn: " " });
    expect(result.ok && result.value.accountNameEn).toBeNull();
  });

  it.each([
    [{ promptpayId: "12345" }, "PROMPTPAY_ID_INVALID"],
    [
      { promptpayType: "national_id", promptpayId: "1101700230701" },
      "PROMPTPAY_ID_INVALID",
    ],
    [{ accountNameTh: "ก" }, "ACCOUNT_NAME_INVALID"],
    [{ accountNameEn: "สมชาย" }, "ACCOUNT_NAME_INVALID"],
    [{ minAmountSatang: 50 }, "MIN_AMOUNT_INVALID"],
    [{ minAmountSatang: 1_000_001 }, "MIN_AMOUNT_INVALID"],
    [{ minAmountSatang: 150.5 }, "MIN_AMOUNT_INVALID"],
    [{ promptpayId: "" }, "PAYMENT_INCOMPLETE"],
    [{ accountNameTh: "  " }, "PAYMENT_INCOMPLETE"],
    [{ enabled: "yes" }, "PAYMENT_SETTINGS_INVALID"],
    [{ promptpayType: "bank" }, "PAYMENT_SETTINGS_INVALID"],
  ])("%o → %s", (patch, code) => {
    const result = validatePaymentSettings({ ...valid, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
  });

  it("ปิดรับโดเนทแล้วข้อมูลว่างได้", () => {
    expect(validatePaymentSettings(DEFAULT_PAYMENT_SETTINGS).ok).toBe(true);
  });
});

describe("normalizeThaiName", () => {
  it.each([
    ["นาย สมชาย ใจดี", "สมชาย ใจดี"],
    ["นางสาวสมหญิง ใจดี", "สมหญิง ใจดี"],
    ["น.ส. สมหญิง", "สมหญิง"],
    ["นางมาลี", "มาลี"],
    ["นายิกา ใจดี", "นายิกา ใจดี"],
    ["สมชาย", "สมชาย"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeThaiName(input)).toBe(expected);
  });
});

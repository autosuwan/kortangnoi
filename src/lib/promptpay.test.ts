import { describe, expect, it } from "vitest";

import {
  buildPromptpayPayload,
  isValidThaiNationalId,
  normalizePromptpayId,
} from "./promptpay";

// vector สร้างจาก promptpay-qr@0.5.0 (ไลบรารีอ้างอิง)
describe("buildPromptpayPayload", () => {
  it.each([
    [
      "phone",
      "081-234-5678",
      undefined,
      "00020101021129370016A000000677010111011300668123456785802TH530376463045D82",
    ],
    [
      "phone",
      "0812345678",
      100,
      "00020101021229370016A000000677010111011300668123456785802TH530376454041.006304DA34",
    ],
    [
      "phone",
      "0812345678",
      123456,
      "00020101021229370016A000000677010111011300668123456785802TH530376454071234.566304D937",
    ],
    [
      "national_id",
      "1101700230708",
      undefined,
      "00020101021129370016A000000677010111021311017002307085802TH5303764630437EC",
    ],
    [
      "national_id",
      "1-1017-00230-70-8",
      2050,
      "00020101021229370016A000000677010111021311017002307085802TH5303764540520.5063046FF6",
    ],
  ] as const)("%s %s amount=%s", (type, id, amountSatang, expected) => {
    expect(buildPromptpayPayload({ type, id, amountSatang })).toBe(expected);
  });

  it("ปฏิเสธเลขที่ไม่ถูกต้อง", () => {
    expect(() =>
      buildPromptpayPayload({ type: "phone", id: "12345" }),
    ).toThrow();
    expect(() =>
      buildPromptpayPayload({ type: "national_id", id: "1101700230701" }),
    ).toThrow();
  });
});

describe("isValidThaiNationalId", () => {
  it("เช็ก checksum", () => {
    expect(isValidThaiNationalId("1101700230708")).toBe(true);
    expect(isValidThaiNationalId("1101700230701")).toBe(false);
    expect(isValidThaiNationalId("110170023070")).toBe(false);
  });
});

it("normalizePromptpayId ตัดขีดและเว้นวรรค", () => {
  expect(normalizePromptpayId(" 081-234 5678 ")).toBe("0812345678");
});

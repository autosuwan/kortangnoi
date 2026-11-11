import { describe, expect, it } from "vitest";

import { cleanDonorText, validateDonationInput } from "./donation";

const valid = { donorName: "สมชาย", amount: "50", message: "สู้ๆ" };

describe("validateDonationInput", () => {
  it("แปลงยอดเป็นสตางค์ และ normalize ข้อความ", () => {
    expect(
      validateDonationInput(
        { donorName: "  สม\nชาย ", amount: "1,234.5", message: "  " },
        2000,
      ),
    ).toEqual({
      ok: true,
      value: {
        donorName: "สม ชาย",
        amountSatang: 123450,
        message: null,
        alertStyle: null,
      },
    });
  });

  it.each([
    [{ donorName: "" }, "DONOR_NAME_INVALID"],
    [{ donorName: "ก".repeat(31) }, "DONOR_NAME_INVALID"],
    [{ message: "ก".repeat(151) }, "MESSAGE_INVALID"],
    [{ amount: "abc" }, "AMOUNT_INVALID"],
    [{ amount: "10.555" }, "AMOUNT_INVALID"],
    [{ amount: "0" }, "AMOUNT_INVALID"],
    [{ amount: "100000.01" }, "AMOUNT_INVALID"],
    [{ amount: "19.99" }, "AMOUNT_TOO_LOW"],
    [{ amount: 50 }, "DONATION_INVALID"],
  ])("%o → %s", (patch, code) => {
    const r = validateDonationInput({ ...valid, ...patch }, 2000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });

  it("ยอดเท่าขั้นต่ำพอดีผ่าน และข้อความแจ้งขั้นต่ำเป็นบาท", () => {
    expect(validateDonationInput({ ...valid, amount: "20" }, 2000).ok).toBe(
      true,
    );
    const r = validateDonationInput({ ...valid, amount: "5" }, 2050);
    expect(!r.ok && r.message).toBe("ยอดต้องไม่ต่ำกว่า 20.5 บาท");
  });
});

it("cleanDonorText ตัดอักขระควบคุมและตัวกลับทิศ", () => {
  expect(cleanDonorText("a‮b​c\td")).toBe("a b c d");
});

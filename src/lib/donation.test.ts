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
        timerDirection: "add",
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

describe("ไม่เปิดเผยชื่อ", () => {
  it("สตรีมเมอร์เปิดไว้ → ชื่อเป็น Anonymous ไม่ต้องกรอกชื่อ", () => {
    const r = validateDonationInput(
      { donorName: "", amount: "50", anonymous: true },
      2000,
      { allowAnonymous: true },
    );
    expect(r.ok && r.value.donorName).toBe("Anonymous");
  });
  it("สตรีมเมอร์ไม่ได้เปิด → ยังต้องกรอกชื่อ", () => {
    const r = validateDonationInput(
      { donorName: "", amount: "50", anonymous: true },
      2000,
    );
    expect(!r.ok && r.code).toBe("DONOR_NAME_INVALID");
    const named = validateDonationInput(
      { donorName: "สมชาย", amount: "50", anonymous: true },
      2000,
    );
    expect(named.ok && named.value.donorName).toBe("สมชาย");
  });
});

it("cleanDonorText ตัดอักขระควบคุมและตัวกลับทิศ", () => {
  expect(cleanDonorText("a‮b​c\td")).toBe("a b c d");
});

describe("timerDirection", () => {
  const base = { donorName: "แมว", amount: "50" };
  it("ค่าเริ่มต้น add, รับ subtract, ค่าอื่นไม่ผ่าน", () => {
    const a = validateDonationInput(base, 2000);
    expect(a.ok && a.value.timerDirection).toBe("add");
    const b = validateDonationInput(
      { ...base, timerDirection: "subtract" },
      2000,
    );
    expect(b.ok && b.value.timerDirection).toBe("subtract");
    expect(
      validateDonationInput({ ...base, timerDirection: "warp" }, 2000).ok,
    ).toBe(false);
  });
});

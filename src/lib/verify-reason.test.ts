import { describe, expect, it } from "vitest";

import { bankName } from "./banks";
import { verifyReasons } from "./verify-reason";

describe("verifyReasons", () => {
  it.each([
    [null, []],
    [{ step: "read_qr" }, ["อ่าน QR บนรูปสลิปไม่ได้"]],
    [{ step: "duplicate_trans_ref" }, ["สลิปนี้ถูกใช้กับรายการอื่นไปแล้ว"]],
    [
      { step: "slipok", slipokCode: 1010 },
      ["สลิปธนาคารนี้ต้องรอธนาคารยืนยันสักครู่ (ปกติ ~8 นาที)"],
    ],
    [
      { step: "slipok", slipokCode: null },
      ["ติดต่อ SlipOK ไม่ได้ (timeout / ระบบล่ม)"],
    ],
    [{ step: "slipok", slipokCode: 1234 }, ["SlipOK ตอบกลับรหัส 1234"]],
    [
      {
        step: "decided",
        checks: {
          receiverNumber: "match",
          receiverName: "mismatch",
          amountMatches: false,
          tooEarly: false,
          late: true,
        },
      },
      ["ชื่อผู้รับไม่ตรง", "ยอดในสลิปไม่ตรงกับที่กรอก", "แนบสลิปหลังหมดเวลา QR (30 นาที)"],
    ],
    [
      {
        step: "decided",
        checks: {
          receiverNumber: "unknown",
          receiverName: "unknown",
          amountMatches: true,
        },
      },
      ["สลิปไม่แสดงเลขพร้อมเพย์ผู้รับ", "สลิปไม่แสดงชื่อผู้รับ"],
    ],
  ])("%o", (input, expected) => {
    expect(verifyReasons(input)).toEqual(expected);
  });
});

it("bankName", () => {
  expect(bankName("004")).toBe("กสิกรไทย");
  expect(bankName("999")).toBe("ธนาคารรหัส 999");
  expect(bankName(null)).toBeNull();
});

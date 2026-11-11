import { describe, expect, it } from "vitest";

import type { ReceiverSnapshot } from "./donation";
import {
  decideReceiver,
  decideSlip,
  mapSlipOkError,
  matchReceiverName,
  matchReceiverNumber,
  normalizeName,
  slipTransferTime,
  type SlipData,
} from "./slip-check";

const phone: ReceiverSnapshot = {
  promptpayType: "phone",
  promptpayId: "0812345678",
  accountNameTh: "สมชาย ใจดี",
  accountNameEn: "SOMCHAI JAIDEE",
  showAccountName: true,
};
const natId: ReceiverSnapshot = {
  ...phone,
  promptpayType: "national_id",
  promptpayId: "1101700230708",
};

describe("matchReceiverNumber", () => {
  it.each([
    [{ type: "MSISDN", value: "xxx-xxx-5678" }, "match"],
    [{ type: "MSISDN", value: "081-234-5678" }, "match"],
    [{ type: "MSISDN", value: "0066812345678" }, "match"],
    [{ type: "MSISDN", value: "66812345678" }, "match"],
    [{ type: "MSISDN", value: "xxx-xxx-5679" }, "mismatch"],
    [{ type: "MSISDN", value: "099-999-9999" }, "mismatch"],
    [{ type: "MSISDN", value: "xxx-xxx-xx78" }, "unknown"], // เห็นแค่ 2 หลัก
    [{ type: "NATID", value: "1101700230708" }, "unknown"], // ชนิดไม่ตรง
    [{ type: "", value: "" }, "unknown"],
    [null, "unknown"],
    [{ value: "xxx-xxx-5678" }, "match"], // ไม่บอกชนิดก็เทียบเลข
  ])("เบอร์ %o → %s", (proxy, expected) => {
    expect(matchReceiverNumber(phone, proxy)).toBe(expected);
  });

  it.each([
    [{ type: "NATID", value: "x-xxxx-xxxxx-70-8" }, "match"],
    [{ type: "NATID", value: "1101700230708" }, "match"],
    [{ type: "NATID", value: "x-xxxx-xxxxx-71-8" }, "mismatch"],
    [{ type: "MSISDN", value: "0812345678" }, "unknown"],
  ])("บัตรประชาชน %o → %s", (proxy, expected) => {
    expect(matchReceiverNumber(natId, proxy)).toBe(expected);
  });
});

describe("matchReceiverName", () => {
  it.each([
    [{ displayName: "นาย สมชาย ใ" }, "match"],
    [{ displayName: "สมชาย ใจดี" }, "match"],
    [{ displayName: "นายสมชาย ใจxxx" }, "match"],
    [{ name: "MR. SOMCHAI J" }, "match"],
    [{ name: "Somchai Jaidee" }, "match"],
    [{ displayName: "สมหญิง ใ" }, "mismatch"],
    [{ name: "MR. JOHN D" }, "mismatch"],
    [{ displayName: "สม" }, "unknown"], // สั้นกว่า 3 ตัว
    [{}, "unknown"],
    [null, "unknown"],
    // ชื่อไทยไม่ตรงแต่ชื่ออังกฤษตรง → ตรง
    [{ displayName: "บริษัท ก", name: "SOMCHAI J" }, "match"],
  ])("%o → %s", (receiver, expected) => {
    expect(matchReceiverName(phone, receiver)).toBe(expected);
  });

  it("สตรีมเมอร์ไม่มีชื่ออังกฤษ: ชื่ออังกฤษในสลิปถือว่าไม่มีข้อมูล (ไม่ใช่ไม่ตรง)", () => {
    const noEn = { ...phone, accountNameEn: null };
    expect(matchReceiverName(noEn, { name: "SOMCHAI J" })).toBe("unknown");
    expect(
      matchReceiverName(noEn, { displayName: "สมชาย ใ", name: "SOMCHAI J" }),
    ).toBe("match");
  });

  it("normalizeName", () => {
    expect(normalizeName("นางสาว สมหญิง ใ.")).toBe("สมหญิงใ");
    expect(normalizeName("MRS. Jane D***")).toBe("janed");
    expect(normalizeName("นายิกา ใจดี")).toBe("นายิกาใจดี"); // ไม่ใช่คำนำหน้า
  });
});

describe("decideReceiver (ตาราง 7 กรณีใน spec)", () => {
  it.each([
    ["match", "match", "approved"],
    ["match", "unknown", "approved"],
    ["unknown", "match", "approved"],
    ["unknown", "unknown", "pending_review"],
    ["match", "mismatch", "pending_review"],
    ["mismatch", "match", "pending_review"],
    ["mismatch", "mismatch", "rejected"],
    ["unknown", "mismatch", "rejected"],
    ["mismatch", "unknown", "rejected"],
  ] as const)("เลข %s + ชื่อ %s → %s", (number, name, expected) => {
    expect(decideReceiver(number, name)).toBe(expected);
  });
});

describe("decideSlip", () => {
  const createdAt = new Date("2026-11-12T10:00:00Z");
  const base = {
    amountSatang: 5000,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + 30 * 60_000),
    receiver: phone,
    now: new Date("2026-11-12T10:05:00Z"),
  };
  const slip = (patch: Partial<SlipData> = {}): SlipData => ({
    transRef: "T1",
    transTimestamp: "2026-11-12T10:03:00.000Z",
    amount: 50,
    receiver: {
      displayName: "นาย สมชาย ใ",
      proxy: { type: "MSISDN", value: "xxx-xxx-5678" },
    },
    ...patch,
  });

  it("ผ่านทุกข้อ → approved", () => {
    expect(decideSlip({ ...base, slip: slip() }).outcome).toBe("approved");
  });

  it("ยอดไม่ตรง → pending_review", () => {
    const d = decideSlip({ ...base, slip: slip({ amount: 49.99 }) });
    expect(d).toMatchObject({
      outcome: "pending_review",
      message: "ยอดโอนไม่ตรงกับที่กรอก ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
    });
  });

  it("ยอดทศนิยมตรง (0.1 + 0.2 ปัญหา float) → ผ่าน", () => {
    const d = decideSlip({
      ...base,
      amountSatang: 30,
      slip: slip({ amount: 0.1 + 0.2 }),
    });
    expect(d.checks.amountMatches).toBe(true);
  });

  it("โอนก่อนสร้างรายการเกิน 2 นาที → rejected; ภายใน 2 นาทียังผ่าน", () => {
    expect(
      decideSlip({
        ...base,
        slip: slip({ transTimestamp: "2026-11-12T09:57:00Z" }),
      }).outcome,
    ).toBe("rejected");
    expect(
      decideSlip({
        ...base,
        slip: slip({ transTimestamp: "2026-11-12T09:59:00Z" }),
      }).outcome,
    ).toBe("approved");
  });

  it("แนบหลังหมดเวลา QR → pending_review", () => {
    const d = decideSlip({
      ...base,
      now: new Date(base.expiresAt.getTime() + 60_000),
      slip: slip({ transTimestamp: "2026-11-12T10:20:00Z" }),
    });
    expect(d).toMatchObject({
      outcome: "pending_review",
      message: "แนบสลิปหลังหมดเวลา ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
    });
  });

  it("ผู้รับผิดคน → rejected แม้ยอดตรง", () => {
    const d = decideSlip({
      ...base,
      slip: slip({
        receiver: {
          displayName: "สมหญิง ใ",
          proxy: { type: "MSISDN", value: "xxx-xxx-9999" },
        },
      }),
    });
    expect(d).toMatchObject({
      outcome: "rejected",
      message: "สลิปนี้ไม่ได้โอนให้สตรีมเมอร์คนนี้",
    });
  });

  it("ไม่มีเวลาในสลิป → rejected (กันสลิปแปลก)", () => {
    expect(
      decideSlip({ ...base, slip: slip({ transTimestamp: null }) }).outcome,
    ).toBe("rejected");
  });
});

it("slipTransferTime ใช้ transDate + transTime เป็นเวลาไทยเมื่อไม่มี timestamp", () => {
  expect(
    slipTransferTime({
      transRef: "x",
      amount: 1,
      transDate: "20200401",
      transTime: "10:15:07",
    })?.toISOString(),
  ).toBe("2020-04-01T03:15:07.000Z");
});

describe("mapSlipOkError", () => {
  it.each([
    [1005, "retry"],
    [1006, "retry"],
    [1007, "retry"],
    [1008, "retry"],
    [1011, "rejected"],
    [1010, "pending_review"],
    [1009, "pending_review"],
    [1002, "pending_review"],
    [1004, "pending_review"],
    [null, "pending_review"],
  ])("%s → %s", (code, kind) => {
    expect(mapSlipOkError(code).kind).toBe(kind);
  });

  it("แอดมินต้องรู้เฉพาะปัญหาฝั่งระบบ/แพ็กเกจ", () => {
    expect(mapSlipOkError(1004)).toMatchObject({ adminError: true });
    expect(mapSlipOkError(null)).toMatchObject({ adminError: true });
    expect(mapSlipOkError(1010)).toMatchObject({ adminError: false });
  });
});

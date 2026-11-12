import { describe, expect, it } from "vitest";

import {
  goalPercent,
  overlayWidgetInputSchema,
  rankDonors,
} from "./overlay-widgets";

describe("goalPercent", () => {
  it("ปัดลง ไม่เกิน 100 ไม่ติดลบ", () => {
    expect(goalPercent(0, 100000)).toBe(0);
    expect(goalPercent(99999, 100000)).toBe(99);
    expect(goalPercent(100000, 100000)).toBe(100);
    expect(goalPercent(250000, 100000)).toBe(100);
    expect(goalPercent(10, 0)).toBe(0);
  });
});

describe("rankDonors", () => {
  const rows = [
    { donorName: "แมวส้ม", amountSatang: 1000 },
    { donorName: "Anonymous", amountSatang: 999999 },
    { donorName: "Bob", amountSatang: 3000 },
    { donorName: " bob ", amountSatang: 3000 },
    { donorName: "แมวส้ม", amountSatang: 2000 },
    { donorName: "Cat", amountSatang: 3000 },
  ];

  it("รวมชื่อเดียวกัน (trim/ตัวพิมพ์) ใช้ตัวสะกดล่าสุด ตัด Anonymous", () => {
    expect(rankDonors(rows, 10)).toEqual([
      { name: "Bob", totalSatang: 6000 },
      { name: "Cat", totalSatang: 3000 },
      { name: "แมวส้ม", totalSatang: 3000 },
    ]);
  });

  it("ยอดเท่ากัน คนที่ถึงก่อนอยู่ก่อน และจำกัดจำนวน", () => {
    expect(rankDonors(rows, 2).map((r) => r.name)).toEqual(["Bob", "Cat"]);
  });
});

describe("overlayWidgetInputSchema", () => {
  const ok = {
    goalTitle: " ซื้อไมค์ใหม่ ",
    goalTargetSatang: 500000,
    qrCaption: "สแกนเพื่อโดเนท",
    topPeriod: "month",
    topCount: 5,
    recentCount: 10,
  };

  it("ผ่านและ trim", () => {
    const r = overlayWidgetInputSchema.parse(ok);
    expect(r.goalTitle).toBe("ซื้อไมค์ใหม่");
  });

  it.each([
    { goalTitle: "   " },
    { goalTitle: "x".repeat(41) },
    { goalTargetSatang: 50 },
    { goalTargetSatang: 1.5 },
    { topPeriod: "year" },
    { topCount: 11 },
    { recentCount: 2 },
  ])("ปฏิเสธ %o", (patch) => {
    expect(
      overlayWidgetInputSchema.safeParse({ ...ok, ...patch }).success,
    ).toBe(false);
  });
});

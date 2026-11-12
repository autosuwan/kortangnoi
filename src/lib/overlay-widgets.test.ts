import { describe, expect, it } from "vitest";

import {
  DEFAULT_STYLES,
  goalPercent,
  overlayWidgetInputSchema,
  rankDonors,
  resolveStyles,
  widgetSize,
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
    styles: DEFAULT_STYLES,
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
    {
      styles: {
        ...DEFAULT_STYLES,
        goal: { ...DEFAULT_STYLES.goal, barFrom: "red" },
      },
    },
    {
      styles: {
        ...DEFAULT_STYLES,
        goal: { ...DEFAULT_STYLES.goal, width: 5000 },
      },
    },
    {
      styles: { ...DEFAULT_STYLES, top: { ...DEFAULT_STYLES.top, title: " " } },
    },
  ])("ปฏิเสธ %o", (patch) => {
    expect(
      overlayWidgetInputSchema.safeParse({ ...ok, ...patch }).success,
    ).toBe(false);
  });
});

describe("resolveStyles", () => {
  it("ค่าว่าง/ไม่ใช่ object → ค่าเริ่มต้นทั้งหมด", () => {
    expect(resolveStyles({})).toEqual(DEFAULT_STYLES);
    expect(resolveStyles(null)).toEqual(DEFAULT_STYLES);
    expect(resolveStyles("x")).toEqual(DEFAULT_STYLES);
  });

  it("ช่องที่ถูกใช้ค่าที่เก็บ ช่องผิด/ขาดใช้ค่าเริ่มต้น สี normalize เป็นตัวใหญ่", () => {
    const r = resolveStyles({
      goal: { width: 400, barFrom: "#22c55e", barTo: "nope", extra: 1 },
      recent: { speed: "warp" },
    });
    expect(r.goal).toEqual({
      ...DEFAULT_STYLES.goal,
      width: 400,
      barFrom: "#22C55E",
    });
    expect(r.recent.speed).toBe("normal");
    expect(r.goal).not.toHaveProperty("extra");
  });
});

describe("widgetSize", () => {
  it("goal กว้างตามที่ตั้ง + ขอบ, ใหญ่ขึ้นตามขนาดตัวอักษร/หลอด", () => {
    const base = widgetSize("goal", DEFAULT_STYLES);
    expect(base.width).toBe(640);
    const big = widgetSize("goal", {
      ...DEFAULT_STYLES,
      goal: { ...DEFAULT_STYLES.goal, textSize: "lg", barHeight: "lg" },
    });
    expect(big.height).toBeGreaterThan(base.height);
  });

  it("QR ใหญ่ขึ้นตามขนาด", () => {
    const sm = widgetSize("qr", {
      ...DEFAULT_STYLES,
      qr: { ...DEFAULT_STYLES.qr, size: "sm" },
    });
    const lg = widgetSize("qr", {
      ...DEFAULT_STYLES,
      qr: { ...DEFAULT_STYLES.qr, size: "lg" },
    });
    expect(lg.width).toBeGreaterThan(sm.width);
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_STYLES,
  formatDelta,
  formatDurationWords,
  subathonDeltaFor,
  formatDuration,
  goalPercent,
  overlayWidgetInputSchema,
  rankDonors,
  resolveStyles,
  subathonSecondsFor,
  timerControlSchema,
  timerDelta,
  timerState,
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
    timerInitialSec: 3600,
    timerStepSatang: 1000,
    timerStepSeconds: 60,
    timerLabel: "Subathon",
    timerMode: "auto",
    timerAllowSubtract: false,
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
    { timerInitialSec: 30 },
    { timerInitialSec: 90000 },
    { timerStepSeconds: 0 },
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

describe("subathon", () => {
  it("เพิ่มเวลาตามสัดส่วน ทุก 10 บาท +60 วิ", () => {
    expect(subathonSecondsFor(1000, 1000, 60)).toBe(60);
    expect(subathonSecondsFor(2500, 1000, 60)).toBe(150);
    expect(subathonSecondsFor(10000, 1000, 60)).toBe(600);
    expect(subathonSecondsFor(150, 1000, 60)).toBe(9);
    expect(subathonSecondsFor(0, 1000, 60)).toBe(0);
  });

  it("format เวลา", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
    expect(formatDuration(59.9)).toBe("00:00:59");
    expect(formatDuration(90061)).toBe("25:01:01");
    expect(formatDuration(-5)).toBe("00:00:00");
    expect(formatDelta(150)).toBe("+2:30");
    expect(formatDelta(3600)).toBe("+1:00:00");
    expect(formatDelta(-300)).toBe("−5:00");
  });

  it("สถานะ + เวลาคงเหลือ", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const base = { endsAt: null, remainingSec: 0, initialSec: 3600 };
    expect(timerState({ ...base, status: "idle" }, now)).toEqual({
      status: "idle",
      remainingSec: 3600,
      endsAt: null,
    });
    expect(
      timerState(
        { ...base, status: "running", endsAt: "2026-11-12T10:30:00.400Z" },
        now,
      ),
    ).toEqual({
      status: "running",
      remainingSec: 1801,
      endsAt: "2026-11-12T10:30:00.400Z",
    });
    expect(
      timerState(
        { ...base, status: "running", endsAt: "2026-11-12T09:59:00Z" },
        now,
      ),
    ).toEqual({ status: "ended", remainingSec: 0, endsAt: null });
    expect(
      timerState({ ...base, status: "paused", remainingSec: 42 }, now),
    ).toEqual({
      status: "paused",
      remainingSec: 42,
      endsAt: null,
    });
    expect(timerState({ ...base, status: "paused" }, now).status).toBe("ended");
  });

  it("คำสั่งควบคุม", () => {
    expect(timerControlSchema.safeParse({ action: "start" }).success).toBe(
      true,
    );
    expect(
      timerControlSchema.safeParse({ action: "adjust", seconds: -300 }).success,
    ).toBe(true);
    expect(timerControlSchema.safeParse({ action: "adjust" }).success).toBe(
      false,
    );
    expect(timerControlSchema.safeParse({ action: "boom" }).success).toBe(
      false,
    );
  });
});

describe("timerDelta", () => {
  const run = (endsAt: string) => ({
    status: "running" as const,
    remainingSec: 0,
    endsAt,
  });
  it("กำลังนับ: ใช้เวลาจบ แม่นยำทุกวินาที", () => {
    expect(
      timerDelta(run("2026-11-12T10:00:00Z"), run("2026-11-12T10:02:30Z")),
    ).toBe(150);
    expect(
      timerDelta(run("2026-11-12T10:00:00Z"), run("2026-11-12T09:55:00Z")),
    ).toBe(-300);
  });
  it("พัก: เทียบเวลาคงเหลือ; เปลี่ยนสถานะ = 0", () => {
    const p = (sec: number) => ({
      status: "paused" as const,
      remainingSec: sec,
      endsAt: null,
    });
    expect(timerDelta(p(100), p(160))).toBe(60);
    expect(timerDelta(run("2026-11-12T10:00:00Z"), p(100))).toBe(0);
    expect(timerDelta(p(100), run("2026-11-12T10:00:00Z"))).toBe(0);
  });
});

describe("formatDurationWords / subathonDeltaFor", () => {
  it("อ่านเป็นคำ", () => {
    expect(formatDurationWords(300)).toBe("5 นาที");
    expect(formatDurationWords(3000)).toBe("50 นาที");
    expect(formatDurationWords(3930)).toBe("1 ชม. 5 นาที 30 วินาที");
    expect(formatDurationWords(45)).toBe("45 วินาที");
    expect(formatDurationWords(0)).toBe("0 วินาที");
  });
  it("ลดเวลาเป็นค่าลบ", () => {
    expect(subathonDeltaFor(1000, "add", 1000, 300)).toBe(300);
    expect(subathonDeltaFor(10000, "subtract", 1000, 300)).toBe(-3000);
  });
});

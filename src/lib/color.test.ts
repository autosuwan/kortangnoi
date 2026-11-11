import { describe, expect, it } from "vitest";

import { hexToHsv, hsvToHex, pointToHueSat } from "./color";

describe("hsv ↔ hex", () => {
  it.each([
    [{ h: 0, s: 1, v: 1 }, "#FF0000"],
    [{ h: 120, s: 1, v: 1 }, "#00FF00"],
    [{ h: 240, s: 1, v: 1 }, "#0000FF"],
    [{ h: 0, s: 0, v: 1 }, "#FFFFFF"],
    [{ h: 0, s: 0, v: 0 }, "#000000"],
  ])("%o → %s", (hsv, hex) => {
    expect(hsvToHex(hsv)).toBe(hex);
  });

  it("ไป-กลับได้สีเดิม", () => {
    for (const hex of ["#FACC15", "#F97316", "#38BDF8", "#A855F7"]) {
      expect(hsvToHex(hexToHsv(hex)!)).toBe(hex);
    }
  });

  it("hex ผิดรูปแบบ → null", () => {
    expect(hexToHsv("red")).toBeNull();
    expect(hexToHsv("#FFF")).toBeNull();
  });
});

describe("pointToHueSat", () => {
  it("บน = 0°, ขวา = 90°, ล่าง = 180°, ซ้าย = 270°", () => {
    expect(pointToHueSat(0, -10, 10).h).toBeCloseTo(0);
    expect(pointToHueSat(10, 0, 10).h).toBeCloseTo(90);
    expect(pointToHueSat(0, 10, 10).h).toBeCloseTo(180);
    expect(pointToHueSat(-10, 0, 10).h).toBeCloseTo(270);
  });

  it("กลางวง = ไม่อิ่มสี, เกินขอบ = อิ่มสุด", () => {
    expect(pointToHueSat(0, 0, 10).s).toBe(0);
    expect(pointToHueSat(5, 0, 10).s).toBeCloseTo(0.5);
    expect(pointToHueSat(30, 0, 10).s).toBe(1);
  });
});

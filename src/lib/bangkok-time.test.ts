import { describe, expect, it } from "vitest";

import { bangkokPeriodStarts } from "./bangkok-time";

describe("bangkokPeriodStarts", () => {
  it("05:04 น. วันที่ 12 (เวลาไทย) = 22:04 UTC วันที่ 11 → วันนี้คือวันที่ 12 ไทย", () => {
    const { dayStart, monthStart } = bangkokPeriodStarts(
      new Date("2026-11-11T22:04:00Z"),
    );
    expect(dayStart.toISOString()).toBe("2026-11-11T17:00:00.000Z");
    expect(monthStart.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });

  it("ก่อนเที่ยงคืนไทยยังเป็นวันเดิม", () => {
    const { dayStart } = bangkokPeriodStarts(new Date("2026-11-11T16:59:00Z"));
    expect(dayStart.toISOString()).toBe("2026-11-10T17:00:00.000Z");
  });

  it("ขึ้นเดือนใหม่ตามเวลาไทย", () => {
    const { monthStart } = bangkokPeriodStarts(
      new Date("2026-11-30T17:30:00Z"),
    );
    expect(monthStart.toISOString()).toBe("2026-11-30T17:00:00.000Z");
  });
});

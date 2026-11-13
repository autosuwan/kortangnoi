import { describe, expect, it } from "vitest";

import { nextSetupStep } from "./setup-steps";

describe("nextSetupStep", () => {
  it("ไปขั้นแรกที่ยังไม่เสร็จ ไม่ใช่ตามลำดับ", () => {
    expect(nextSetupStep([false, false, false])).toBe(1);
    expect(nextSetupStep([true, false, true])).toBe(2);
    expect(nextSetupStep([false, true, true])).toBe(1);
    expect(nextSetupStep([true, true, false])).toBe(3);
  });
  it("เสร็จหมดแล้ว → ขั้นสุดท้าย", () => {
    expect(nextSetupStep([true, true, true])).toBe(3);
  });
});

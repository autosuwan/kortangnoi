import { describe, expect, it } from "vitest";

import { commitIntegerText, sanitizeIntegerText } from "./integer-input";

describe("sanitizeIntegerText", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["15", "15"],
    ["01", "1"],
    ["0", "0"],
    ["1,000", "1000"],
    ["12a3", "123"],
  ])("%j → %j", (input, out) => {
    expect(sanitizeIntegerText(input)).toBe(out);
  });
});

describe("commitIntegerText", () => {
  it("ว่างหรือต่ำกว่าขั้นต่ำ → min, เกิน → max", () => {
    expect(commitIntegerText("", 1, 100)).toBe(1);
    expect(commitIntegerText("0", 1, 100)).toBe(1);
    expect(commitIntegerText("500", 1, 100)).toBe(100);
    expect(commitIntegerText("11", 1, 100)).toBe(11);
  });
});

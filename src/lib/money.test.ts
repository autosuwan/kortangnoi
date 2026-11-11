import { describe, expect, it } from "vitest";

import { formatSatang, parseBahtToSatang } from "./money";

describe("parseBahtToSatang", () => {
  it.each([
    ["50", 5000],
    ["50.5", 5050],
    ["50.05", 5005],
    ["1,234.50", 123450],
    [" 20 ", 2000],
    ["0.01", 1],
  ])("แปลง %s เป็น %i สตางค์", (input, expected) => {
    expect(parseBahtToSatang(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-5", "1e3", "12.", ".5"])(
    "ปฏิเสธ %j",
    (input) => {
      expect(parseBahtToSatang(input)).toBeNull();
    },
  );
});

describe("formatSatang", () => {
  it("ไม่แสดงทศนิยมเมื่อเป็นบาทเต็ม", () => {
    expect(formatSatang(123400)).toBe("฿1,234");
  });

  it("แสดงสตางค์ 2 หลัก", () => {
    expect(formatSatang(123405)).toBe("฿1,234.05");
  });
});

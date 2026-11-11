import { describe, expect, it } from "vitest";

import { checkUsername } from "./username";

describe("checkUsername", () => {
  it.each([
    ["suwan", "suwan"],
    ["  Suwan_01 ", "suwan_01"],
    ["a-b", "a-b"],
    ["x".repeat(20), "x".repeat(20)],
  ])("รับ %j เป็น %j", (input, expected) => {
    expect(checkUsername(input)).toEqual({ ok: true, username: expected });
  });

  it.each(["ab", "x".repeat(21), "สวัสดี", "has space", "a.b", "a@b", ""])(
    "ปฏิเสธรูปแบบผิด %j",
    (input) => {
      expect(checkUsername(input)).toMatchObject({ ok: false });
    },
  );

  it.each(["api", "Dashboard", "overlay", "_next"])(
    "ปฏิเสธคำสงวน %j",
    (input) => {
      expect(checkUsername(input)).toEqual({
        ok: false,
        message: "ชื่อนี้ใช้ไม่ได้ ลองชื่ออื่น",
      });
    },
  );
});

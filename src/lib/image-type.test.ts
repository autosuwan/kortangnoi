import { describe, expect, it } from "vitest";

import { detectImageType } from "./image-type";

const bytes = (...xs: (number | string)[]) =>
  new Uint8Array(
    xs.flatMap((x) =>
      typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x],
    ),
  );

describe("detectImageType", () => {
  it.each([
    [bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0), "png"],
    [bytes(0xff, 0xd8, 0xff, 0xe0), "jpg"],
    [bytes("GIF89a", 1, 0), "gif"],
    [bytes("GIF87a"), "gif"],
    [bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "), "webp"],
  ])("%#", (input, ext) => {
    expect(detectImageType(input)?.ext).toBe(ext);
  });

  it.each([
    ["text ที่ตั้งชื่อ .png", bytes("hello world")],
    ["svg", bytes("<svg xmlns")],
    ["RIFF ที่ไม่ใช่ webp", bytes("RIFF", 0, 0, 0, 0, "WAVE")],
    ["ว่าง", bytes()],
  ])("ปฏิเสธ %s", (_, input) => {
    expect(detectImageType(input)).toBeNull();
  });
});

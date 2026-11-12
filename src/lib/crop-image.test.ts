import { describe, expect, it } from "vitest";

import { CROP_PRESETS, cropOutputSize, shouldCrop } from "./crop-image";

describe("cropOutputSize", () => {
  it("ย่อรูปใหญ่ให้อยู่ในกรอบ คงสัดส่วน", () => {
    expect(cropOutputSize({ width: 3000, height: 1000 }, 1500, 500)).toEqual({
      width: 1500,
      height: 500,
    });
    expect(cropOutputSize({ width: 2000, height: 1000 }, 800, 800)).toEqual({
      width: 800,
      height: 400,
    });
  });

  it("ไม่ขยายรูปเล็ก", () => {
    expect(cropOutputSize({ width: 300, height: 300 }, 512, 512)).toEqual({
      width: 300,
      height: 300,
    });
  });

  it("แนวตั้งย่อตามด้านสูง", () => {
    expect(cropOutputSize({ width: 1000, height: 2000 }, 800, 800)).toEqual({
      width: 400,
      height: 800,
    });
  });
});

describe("presets", () => {
  it("avatar 1:1 วงกลม, banner 3:1, alert อิสระ", () => {
    expect(CROP_PRESETS.avatar).toMatchObject({ aspect: 1, round: true });
    expect(CROP_PRESETS.banner.aspect).toBe(3);
    expect("aspect" in CROP_PRESETS.alert).toBe(false);
  });
});

describe("shouldCrop", () => {
  it("ครอปเฉพาะ PNG/JPG/WebP — GIF และไฟล์อื่นส่งตรง", () => {
    expect(shouldCrop(new File([], "a.gif", { type: "image/gif" }))).toBe(
      false,
    );
    expect(shouldCrop(new File([], "a.png", { type: "image/png" }))).toBe(true);
    expect(shouldCrop(new File([], "a.jpg", { type: "image/jpeg" }))).toBe(
      true,
    );
    expect(shouldCrop(new File([], "a.txt", { type: "text/plain" }))).toBe(
      false,
    );
  });
});

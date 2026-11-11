import "server-only";

import jsQR from "jsqr";
import sharp, { type Sharp } from "sharp";

/**
 * อ่าน QR ขวาล่างของสลิปจากรูป — ลองหลายแบบเพราะรูปจากมือถือมีทั้งใหญ่ เล็ก และถูกครอป
 * คืน payload ของ QR หรือ null ถ้าอ่านไม่ได้
 */
export async function readSlipQr(bytes: Uint8Array): Promise<string | null> {
  const attempts: ((img: Sharp) => Sharp)[] = [
    (img) =>
      img.resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      }),
    (img) => img.resize({ width: 800, height: 800, fit: "inside" }),
    (img) =>
      img
        .resize({ width: 1600, height: 1600, fit: "inside" })
        .grayscale()
        .normalise()
        .sharpen(),
    (img) =>
      img
        .resize({ width: 600, height: 600, fit: "inside" })
        .grayscale()
        .threshold(140),
  ];

  for (const transform of attempts) {
    try {
      const { data, info } = await transform(sharp(bytes).rotate())
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
        inversionAttempts: "attemptBoth",
      });
      if (code?.data) return code.data;
    } catch {
      // รูปเสีย/อ่านไม่ได้ → ลองแบบถัดไป
    }
  }
  return null;
}

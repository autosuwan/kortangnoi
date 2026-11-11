export type ImageType = { ext: "png" | "jpg" | "gif" | "webp"; mime: string };

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  sig.every((b, i) => bytes[offset + i] === b);

/** ดูชนิดรูปจาก magic bytes (ไม่เชื่อนามสกุลหรือ content-type ที่ client ส่งมา) */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { ext: "png", mime: "image/png" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff]))
    return { ext: "jpg", mime: "image/jpeg" };
  // "GIF87a" / "GIF89a"
  if (
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  )
    return { ext: "gif", mime: "image/gif" };
  // "RIFF" .... "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return { ext: "webp", mime: "image/webp" };
  return null;
}

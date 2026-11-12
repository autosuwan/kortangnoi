/** พื้นที่ที่ครอป (พิกเซลของรูปต้นฉบับ) — ตรงกับ Area ของ react-easy-crop */
export type CropArea = { x: number; y: number; width: number; height: number };

export type CropPreset = {
  /** สัดส่วนกว้าง/สูง; undefined = อิสระ (ใช้สัดส่วนของรูป) */
  aspect?: number;
  /** ขนาดผลลัพธ์สูงสุด — ย่อลงให้อยู่ในกรอบนี้ ไม่ขยาย */
  maxWidth: number;
  maxHeight: number;
  round?: boolean;
};

export const CROP_PRESETS = {
  avatar: { aspect: 1, maxWidth: 512, maxHeight: 512, round: true },
  banner: { aspect: 3, maxWidth: 1500, maxHeight: 500 },
  alert: { maxWidth: 800, maxHeight: 800 },
} satisfies Record<string, CropPreset>;

/** ไฟล์ต้นฉบับใหญ่สุดที่ยอมเปิดครอป (กันเครื่องค้าง) */
export const CROP_SOURCE_MAX_BYTES = 20 * 1024 * 1024;

const CROPPABLE = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * ครอปเฉพาะ PNG/JPG/WebP — GIF ครอปด้วย canvas แล้วภาพเคลื่อนไหวจะหยุด
 * ส่วนไฟล์ชนิดอื่นส่งตรงให้ server ปฏิเสธพร้อมข้อความ error ตามเดิม
 */
export const shouldCrop = (file: File) => CROPPABLE.has(file.type);

/** ขนาดผลลัพธ์: ย่อพื้นที่ครอปลงให้อยู่ในกรอบ maxWidth × maxHeight คงสัดส่วน */
export function cropOutputSize(
  area: Pick<CropArea, "width" | "height">,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(1, maxWidth / area.width, maxHeight / area.height);
  return {
    width: Math.max(1, Math.round(area.width * scale)),
    height: Math.max(1, Math.round(area.height * scale)),
  };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));

/** วาดส่วนที่ครอปลง canvas แล้วคืนเป็นไฟล์ WebP (เบราว์เซอร์ไม่รองรับ → PNG) */
export async function cropImageToFile(
  source: Blob,
  area: CropArea,
  preset: CropPreset,
  name = "image",
): Promise<File> {
  const bitmap = await createImageBitmap(source);
  const { width, height } = cropOutputSize(
    area,
    preset.maxWidth,
    preset.maxHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    width,
    height,
  );
  bitmap.close();

  let blob = await toBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp")
    blob = await toBlob(canvas, "image/png");
  if (!blob) throw new Error("crop failed");
  const ext = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `${name}.${ext}`, { type: blob.type });
}

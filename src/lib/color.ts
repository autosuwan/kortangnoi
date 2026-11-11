/** แปลงสีสำหรับวงล้อสี: hue = มุม (0–360), saturation = ระยะจากกลาง (0–1), value = ความสว่าง (0–1) */
export type Hsv = { h: number; s: number; v: number };

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return (
    "#" +
    [f(5), f(3), f(1)]
      .map((c) =>
        Math.round(c * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}

export function hexToHsv(hex: string): Hsv | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(
    (c) => c / 255,
  );
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

/**
 * ตำแหน่งที่จิ้มบนวงล้อ (เทียบกับจุดกลาง, รัศมี radius) → hue/saturation
 * มุม 0° อยู่ด้านบน หมุนตามเข็มนาฬิกา ให้ตรงกับ conic-gradient
 */
export function pointToHueSat(dx: number, dy: number, radius: number) {
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return {
    h: (angle + 360) % 360,
    s: Math.min(1, Math.hypot(dx, dy) / radius),
  };
}

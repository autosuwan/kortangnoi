/**
 * แปลงยอดเงินที่ผู้ใช้กรอก (string บาท เช่น "50", "50.5", "1,234.50") เป็นสตางค์ (integer)
 * คืน null ถ้ารูปแบบไม่ถูกต้อง หรือมีทศนิยมเกิน 2 ตำแหน่ง ไม่ใช้ float ในการคำนวณ
 */
export function parseBahtToSatang(input: string): number | null {
  const normalized = input.trim().replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const [, baht, fraction = ""] = match;
  const satang = Number(baht) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(satang) ? satang : null;
}

/** แสดงสตางค์เป็นบาท: 123400 → "฿1,234", 123450 → "฿1,234.50" */
export function formatSatang(satang: number): string {
  const baht = Math.trunc(satang / 100);
  const fraction = Math.abs(satang % 100);
  const bahtText = baht.toLocaleString("en-US");
  return fraction === 0
    ? `฿${bahtText}`
    : `฿${bahtText}.${String(fraction).padStart(2, "0")}`;
}

/** ตัวเลขยอดไม่มีสัญลักษณ์: 123400 → "1,234", 123450 → "1,234.50" (ใช้คู่กับคำว่า "บาท") */
export function formatSatangNumber(satang: number): string {
  return formatSatang(satang).replace("฿", "");
}

/**
 * สร้าง payload ของ QR พร้อมเพย์ (มาตรฐาน EMVCo / Thai QR) เอง แทน `promptpay-qr`
 * ที่เลิกดูแลแล้ว — ผลต้องตรงกับ `promptpay-qr` (ดู test)
 */

export type PromptpayType = "phone" | "national_id";

const GUID_PROMPTPAY = "A000000677010111";

/** ตัดทุกอย่างที่ไม่ใช่ตัวเลข (ขีด เว้นวรรค) */
export function normalizePromptpayId(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidThaiPhone(id: string): boolean {
  return /^0\d{9}$/.test(id);
}

/** เลขบัตรประชาชน 13 หลัก + checksum หลักสุดท้าย */
export function isValidThaiNationalId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

export function isValidPromptpayId(type: PromptpayType, id: string): boolean {
  return type === "phone" ? isValidThaiPhone(id) : isValidThaiNationalId(id);
}

function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) ตามที่ EMVCo กำหนด */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(data)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPromptpayPayload({
  type,
  id,
  amountSatang,
}: {
  type: PromptpayType;
  id: string;
  amountSatang?: number;
}): string {
  const target = normalizePromptpayId(id);
  if (!isValidPromptpayId(type, target)) {
    throw new Error("invalid PromptPay id");
  }

  // เบอร์โทร: 0812345678 → 0066812345678 (13 หลัก)
  const account =
    type === "phone"
      ? field("01", ("66" + target.slice(1)).padStart(13, "0"))
      : field("02", target);

  const hasAmount = amountSatang !== undefined && amountSatang > 0;
  if (hasAmount && !Number.isSafeInteger(amountSatang)) {
    throw new Error("amountSatang must be an integer");
  }

  const body =
    field("00", "01") +
    field("01", hasAmount ? "12" : "11") +
    field("29", field("00", GUID_PROMPTPAY) + account) +
    field("58", "TH") +
    field("53", "764") +
    (hasAmount ? field("54", formatAmount(amountSatang)) : "") +
    "6304";

  return body + crc16(body);
}

/** 150 → "1.50" โดยไม่ใช้ float */
function formatAmount(satang: number): string {
  return `${Math.trunc(satang / 100)}.${String(satang % 100).padStart(2, "0")}`;
}

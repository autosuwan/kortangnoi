/**
 * แปลง donations.verify_result เป็นเหตุผลภาษาไทยให้สตรีมเมอร์อ่านใน drawer (F5/F6)
 * — ทำไมระบบตรวจอัตโนมัติไม่ผ่าน/ส่งมาให้ตรวจเอง
 */
type Checks = {
  receiverNumber?: string;
  receiverName?: string;
  amountMatches?: boolean;
  tooEarly?: boolean;
  late?: boolean;
};
type VerifyResult = {
  step?: string;
  slipokCode?: number | null;
  slipokMessage?: string;
  checks?: Checks;
} | null;

const SLIPOK_REASONS: Record<number, string> = {
  1000: "SlipOK อ่านข้อมูลสลิปไม่ได้",
  1002: "ตั้งค่า key ของ SlipOK ไม่ถูกต้อง (แจ้งแอดมิน)",
  1003: "แพ็กเกจ SlipOK หมดอายุ (แจ้งแอดมิน)",
  1004: "โควตา SlipOK หมด (แจ้งแอดมิน)",
  1009: "ระบบธนาคารขัดข้องชั่วคราว",
  1010: "สลิปธนาคารนี้ต้องรอธนาคารยืนยันสักครู่ (ปกติ ~8 นาที)",
  1011: "ไม่พบรายการโอนนี้ในระบบธนาคาร",
  1015: "ไม่พบแพ็กเกจ SlipOK (แจ้งแอดมิน)",
};

const NUMBER = {
  match: "เลขพร้อมเพย์ผู้รับตรง",
  mismatch: "เลขพร้อมเพย์ผู้รับไม่ตรง",
  unknown: "สลิปไม่แสดงเลขพร้อมเพย์ผู้รับ",
} as Record<string, string>;
const NAME = {
  match: "ชื่อผู้รับตรง",
  mismatch: "ชื่อผู้รับไม่ตรง",
  unknown: "สลิปไม่แสดงชื่อผู้รับ",
} as Record<string, string>;

export function verifyReasons(result: unknown): string[] {
  const r = result as VerifyResult;
  if (!r?.step) return [];
  switch (r.step) {
    case "read_qr":
      return ["อ่าน QR บนรูปสลิปไม่ได้"];
    case "duplicate_qr":
    case "duplicate_trans_ref":
    case "duplicate_race":
      return ["สลิปนี้ถูกใช้กับรายการอื่นไปแล้ว"];
    case "slipok": {
      const code = r.slipokCode ?? null;
      if (code === null) return ["ติดต่อ SlipOK ไม่ได้ (timeout / ระบบล่ม)"];
      return [SLIPOK_REASONS[code] ?? `SlipOK ตอบกลับรหัส ${code}`];
    }
    case "decided": {
      const c = r.checks ?? {};
      const reasons: string[] = [];
      if (c.receiverNumber && c.receiverNumber !== "match") {
        reasons.push(NUMBER[c.receiverNumber]);
      }
      if (c.receiverName && c.receiverName !== "match") {
        reasons.push(NAME[c.receiverName]);
      }
      if (c.amountMatches === false) reasons.push("ยอดในสลิปไม่ตรงกับที่กรอก");
      if (c.tooEarly) reasons.push("เวลาโอนอยู่ก่อนสร้างรายการ");
      if (c.late) reasons.push("แนบสลิปหลังหมดเวลา QR (30 นาที)");
      return reasons;
    }
    default:
      return [];
  }
}

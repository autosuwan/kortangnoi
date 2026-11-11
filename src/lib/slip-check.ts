/**
 * F10 ตัดสินผลสลิป — logic pure ทั้งหมด (ไม่มี I/O) ให้ test ได้ละเอียด
 * อ้างอิงตาราง "เช็กผู้รับ" และ "Error ของ SlipOK" ใน docs/spec.md
 */
import type { ReceiverSnapshot } from "@/lib/donation";

/** ข้อมูลที่ใช้จาก response ของ SlipOK (data) */
export type SlipData = {
  transRef: string;
  transDate?: string | null; // "20200401"
  transTime?: string | null; // "10:15:07" (เวลาไทย)
  transTimestamp?: string | null; // ISO 8601
  amount: number; // บาท
  receiver?: {
    displayName?: string | null;
    name?: string | null;
    proxy?: { type?: string | null; value?: string | null } | null;
    account?: { type?: string | null; value?: string | null } | null;
  } | null;
};

export type MatchResult = "match" | "mismatch" | "unknown";
export type SlipOutcome = "approved" | "pending_review" | "rejected";

// ---------------------------------------------------------------------------
// เลขพร้อมเพย์ผู้รับ
// ---------------------------------------------------------------------------

const PROXY_TYPE = { phone: "MSISDN", national_id: "NATID" } as const;

/**
 * เทียบเลขพร้อมเพย์ในสลิป (อาจถูกปิดบางหลักด้วย x) กับเลขของสตรีมเมอร์ จัดชิดขวา
 * เบอร์ใช้ 9 หลักท้าย (รองรับ 0812..., 66812..., 0066812...)
 * ใช้เฉพาะ proxy ที่ชนิดตรงกัน — account เป็นเลขบัญชีธนาคารที่เราไม่รู้ จึงไม่ใช้
 */
export function matchReceiverNumber(
  snapshot: Pick<ReceiverSnapshot, "promptpayType" | "promptpayId">,
  proxy: { type?: string | null; value?: string | null } | null | undefined,
): MatchResult {
  const value = proxy?.value?.replace(/[^0-9xX]/g, "") ?? "";
  if (!value) return "unknown";
  const type = proxy?.type?.trim().toUpperCase();
  if (type && type !== PROXY_TYPE[snapshot.promptpayType]) return "unknown";

  const len = snapshot.promptpayType === "phone" ? 9 : 13;
  const expected = snapshot.promptpayId.slice(-len);
  const shown = value.slice(-len);

  let compared = 0;
  for (let i = 1; i <= shown.length; i++) {
    const c = shown[shown.length - i];
    if (!/\d/.test(c)) continue;
    const e = expected[expected.length - i];
    if (e === undefined || e !== c) return "mismatch";
    compared++;
  }
  return compared >= 3 ? "match" : "unknown";
}

// ---------------------------------------------------------------------------
// ชื่อผู้รับ
// ---------------------------------------------------------------------------

const TITLE =
  /^(?:นางสาว|น\.\s?ส\.|นาง|นาย|mr\.?|mrs\.?|ms\.?|miss)(?=[\s.]|[ก-ฮเ-ไ])/i;
const THAI = /[฀-๿]/;

/** ตัดคำนำหน้า, ส่วนที่ถูกปิด (xxx / ***), ช่องว่าง, จุด แล้วเป็นตัวเล็ก */
export function normalizeName(input: string): string {
  let s = input.trim().replace(TITLE, "").trim();
  const masked = s.search(/x{2,}|\*/i);
  if (masked >= 0) s = s.slice(0, masked);
  return s.replace(/[\s.]/g, "").toLowerCase();
}

/**
 * ชื่อในสลิป (อาจถูกตัดท้าย) ต้องเป็น prefix ของชื่อบัญชี และยาว ≥ 3 ตัว
 * ชื่อภาษาไทยเทียบกับชื่อไทย ชื่ออังกฤษเทียบกับชื่ออังกฤษ — สตรีมเมอร์ไม่ได้กรอกชื่ออังกฤษ = ไม่มีข้อมูล
 */
export function matchReceiverName(
  snapshot: Pick<ReceiverSnapshot, "accountNameTh" | "accountNameEn">,
  receiver:
    { displayName?: string | null; name?: string | null } | null | undefined,
): MatchResult {
  const th = normalizeName(snapshot.accountNameTh);
  const en = snapshot.accountNameEn
    ? normalizeName(snapshot.accountNameEn)
    : "";

  let sawMismatch = false;
  for (const raw of [receiver?.displayName, receiver?.name]) {
    if (!raw) continue;
    const name = normalizeName(raw);
    if (name.length < 3) continue;
    const target = THAI.test(name) ? th : en;
    if (!target) continue;
    if (target.startsWith(name)) return "match";
    sawMismatch = true;
  }
  return sawMismatch ? "mismatch" : "unknown";
}

/** ตาราง "เช็กผู้รับ (ขั้น 8)" ใน spec */
export function decideReceiver(
  number: MatchResult,
  name: MatchResult,
): SlipOutcome {
  if (number === "match")
    return name === "mismatch" ? "pending_review" : "approved";
  if (number === "unknown") {
    if (name === "match") return "approved";
    return name === "unknown" ? "pending_review" : "rejected";
  }
  // เลขไม่ตรง
  return name === "match" ? "pending_review" : "rejected";
}

// ---------------------------------------------------------------------------
// ตัดสินผลทั้งสลิป (ขั้น 8–11)
// ---------------------------------------------------------------------------

export const SLIP_MESSAGES = {
  approved: "ขอบคุณ! โดเนทของคุณขึ้นจอแล้ว",
  wrongReceiver: "สลิปนี้ไม่ได้โอนให้สตรีมเมอร์คนนี้",
  checkReceiver: "ส่งให้สตรีมเมอร์ตรวจสอบชื่อผู้รับแล้ว",
  wrongAmount: "ยอดโอนไม่ตรงกับที่กรอก ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
  tooEarly: "สลิปนี้โอนก่อนสร้างรายการ",
  late: "แนบสลิปหลังหมดเวลา ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
  duplicate: "สลิปนี้ถูกใช้ไปแล้ว",
} as const;

const TIME_SLACK_MS = 2 * 60 * 1000;

/** เวลาโอนจากสลิป: ใช้ transTimestamp ถ้ามี ไม่งั้นรวม transDate + transTime (เวลาไทย) */
export function slipTransferTime(slip: SlipData): Date | null {
  if (slip.transTimestamp) {
    const t = new Date(slip.transTimestamp);
    if (!Number.isNaN(t.getTime())) return t;
  }
  const d = slip.transDate?.match(/^(\d{4})(\d{2})(\d{2})$/);
  const t = slip.transTime?.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!d || !t) return null;
  const iso = `${d[1]}-${d[2]}-${d[3]}T${t[1]}:${t[2]}:${t[3] ?? "00"}+07:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type SlipDecision = {
  outcome: SlipOutcome;
  message: string;
  checks: {
    receiverNumber: MatchResult;
    receiverName: MatchResult;
    amountMatches: boolean;
    transferredAt: string | null;
    tooEarly: boolean;
    late: boolean;
  };
};

export function decideSlip({
  amountSatang,
  createdAt,
  expiresAt,
  receiver,
  slip,
  now,
}: {
  amountSatang: number;
  createdAt: Date;
  expiresAt: Date;
  receiver: ReceiverSnapshot;
  slip: SlipData;
  now: Date;
}): SlipDecision {
  const receiverNumber = matchReceiverNumber(receiver, slip.receiver?.proxy);
  const receiverName = matchReceiverName(receiver, slip.receiver);
  const receiverOutcome = decideReceiver(receiverNumber, receiverName);
  const amountMatches = Math.round(slip.amount * 100) === amountSatang;
  const transferredAt = slipTransferTime(slip);
  const tooEarly =
    !transferredAt ||
    transferredAt.getTime() < createdAt.getTime() - TIME_SLACK_MS ||
    transferredAt.getTime() > now.getTime() + TIME_SLACK_MS;
  const late = now.getTime() > expiresAt.getTime();

  const checks = {
    receiverNumber,
    receiverName,
    amountMatches,
    transferredAt: transferredAt?.toISOString() ?? null,
    tooEarly,
    late,
  };

  // rejected มาก่อน pending — ตามลำดับขั้นใน spec
  if (receiverOutcome === "rejected") {
    return {
      outcome: "rejected",
      message: SLIP_MESSAGES.wrongReceiver,
      checks,
    };
  }
  if (tooEarly) {
    return { outcome: "rejected", message: SLIP_MESSAGES.tooEarly, checks };
  }
  if (receiverOutcome === "pending_review") {
    return {
      outcome: "pending_review",
      message: SLIP_MESSAGES.checkReceiver,
      checks,
    };
  }
  if (!amountMatches) {
    return {
      outcome: "pending_review",
      message: SLIP_MESSAGES.wrongAmount,
      checks,
    };
  }
  if (late) {
    return { outcome: "pending_review", message: SLIP_MESSAGES.late, checks };
  }
  return { outcome: "approved", message: SLIP_MESSAGES.approved, checks };
}

// ---------------------------------------------------------------------------
// Error ของ SlipOK
// ---------------------------------------------------------------------------

export type SlipOkErrorAction =
  | { kind: "retry"; message: string } // กลับไป awaiting_slip นับสิทธิ์แนบ
  | { kind: "rejected"; message: string }
  | { kind: "pending_review"; message: string; adminError: boolean };

/** ตาราง "Error ของ SlipOK → ผลลัพธ์" ใน spec; code null = timeout / network / 5xx */
export function mapSlipOkError(code: number | null): SlipOkErrorAction {
  switch (code) {
    case 1005:
    case 1006:
      return { kind: "retry", message: "รูปสลิปไม่ถูกต้อง ลองแนบใหม่" };
    case 1007:
      return {
        kind: "retry",
        message: "ไม่พบ QR บนสลิป ลองครอปให้เห็น QR ชัดๆ",
      };
    case 1008:
      return { kind: "retry", message: "QR นี้ไม่ใช่สลิปโอนเงิน" };
    case 1011:
      return { kind: "rejected", message: "ไม่พบรายการโอนนี้ในระบบธนาคาร" };
    case 1010:
      return {
        kind: "pending_review",
        message: "สลิปธนาคารนี้ต้องรอธนาคารยืนยันสักครู่ ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
        adminError: false,
      };
    case 1009:
      return {
        kind: "pending_review",
        message: "ระบบธนาคารขัดข้องชั่วคราว ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
        adminError: false,
      };
    default:
      // 1000–1004, 1012–1015, timeout, 5xx: ปัญหาฝั่งระบบ/แพ็กเกจ — แอดมินต้องรู้
      return {
        kind: "pending_review",
        message: "ตรวจสลิปอัตโนมัติไม่ได้ตอนนี้ ส่งให้สตรีมเมอร์ตรวจสอบแล้ว",
        adminError: true,
      };
  }
}

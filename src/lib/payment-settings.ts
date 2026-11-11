import { z } from "zod";

import {
  isValidPromptpayId,
  normalizePromptpayId,
  type PromptpayType,
} from "@/lib/promptpay";

export type PaymentSettings = {
  enabled: boolean;
  promptpayType: PromptpayType;
  promptpayId: string;
  accountNameTh: string;
  accountNameEn: string | null;
  showAccountName: boolean;
  minAmountSatang: number;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: false,
  promptpayType: "phone",
  promptpayId: "",
  accountNameTh: "",
  accountNameEn: null,
  showAccountName: true,
  minAmountSatang: 2000,
};

export const MIN_AMOUNT_SATANG = { min: 100, max: 1_000_000 } as const;

/** รูปทรงของ body — กฎทางธุรกิจตรวจต่อใน validatePaymentSettings */
const bodySchema = z.object({
  enabled: z.boolean(),
  promptpayType: z.enum(["phone", "national_id"]),
  promptpayId: z.string().max(40),
  accountNameTh: z.string().max(200),
  accountNameEn: z.string().max(200).nullable(),
  showAccountName: z.boolean(),
  minAmountSatang: z.number(),
});

export type PaymentSettingsErrorCode =
  | "PAYMENT_SETTINGS_INVALID"
  | "PROMPTPAY_ID_INVALID"
  | "ACCOUNT_NAME_INVALID"
  | "MIN_AMOUNT_INVALID"
  | "PAYMENT_INCOMPLETE";

export type PaymentSettingsResult =
  | { ok: true; value: PaymentSettings }
  | {
      ok: false;
      code: PaymentSettingsErrorCode;
      message: string;
      field?: keyof PaymentSettings;
    };

const collapseSpaces = (s: string) => s.trim().replace(/\s+/g, " ");

// ตัดคำนำหน้าเฉพาะเมื่อส่วนที่เหลือขึ้นต้นด้วยเว้นวรรค พยัญชนะ หรือสระหน้า (เ แ โ ใ ไ)
// กันตัดผิดกับชื่อที่บังเอิญขึ้นต้นเหมือนคำนำหน้า เช่น "นายิกา"
const THAI_TITLE = /^(?:นางสาว|น\.\s?ส\.|นาง|นาย)(?=[\sก-ฮเ-ไ])/;

export function normalizeThaiName(input: string): string {
  return collapseSpaces(collapseSpaces(input).replace(THAI_TITLE, ""));
}

export function normalizeEnglishName(input: string): string {
  return collapseSpaces(input).toUpperCase();
}

export function validatePaymentSettings(input: unknown): PaymentSettingsResult {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "PAYMENT_SETTINGS_INVALID",
      message: "ข้อมูลไม่ถูกต้อง",
    };
  }
  const body = parsed.data;

  const promptpayId = normalizePromptpayId(body.promptpayId);
  if (promptpayId && !isValidPromptpayId(body.promptpayType, promptpayId)) {
    return {
      ok: false,
      code: "PROMPTPAY_ID_INVALID",
      field: "promptpayId",
      message:
        body.promptpayType === "phone"
          ? "เบอร์โทรต้องมี 10 หลัก ขึ้นต้นด้วย 0"
          : "เลขบัตรประชาชนไม่ถูกต้อง",
    };
  }

  const accountNameTh = normalizeThaiName(body.accountNameTh);
  if (
    accountNameTh &&
    (accountNameTh.length < 2 || accountNameTh.length > 100)
  ) {
    return {
      ok: false,
      code: "ACCOUNT_NAME_INVALID",
      field: "accountNameTh",
      message: "ชื่อบัญชีต้องยาว 2–100 ตัวอักษร",
    };
  }

  const accountNameEn = normalizeEnglishName(body.accountNameEn ?? "") || null;
  if (accountNameEn && !/^[A-Z .]{2,100}$/.test(accountNameEn)) {
    return {
      ok: false,
      code: "ACCOUNT_NAME_INVALID",
      field: "accountNameEn",
      message: "ชื่ออังกฤษใช้ได้เฉพาะ A–Z เว้นวรรค และจุด (2–100 ตัว)",
    };
  }

  const { minAmountSatang } = body;
  if (
    !Number.isInteger(minAmountSatang) ||
    minAmountSatang < MIN_AMOUNT_SATANG.min ||
    minAmountSatang > MIN_AMOUNT_SATANG.max
  ) {
    return {
      ok: false,
      code: "MIN_AMOUNT_INVALID",
      field: "minAmountSatang",
      message: "ยอดขั้นต่ำต้องอยู่ระหว่าง 1–10,000 บาท",
    };
  }

  if (body.enabled && (!promptpayId || !accountNameTh)) {
    return {
      ok: false,
      code: "PAYMENT_INCOMPLETE",
      field: !promptpayId ? "promptpayId" : "accountNameTh",
      message: "กรอกเลขพร้อมเพย์และชื่อบัญชีให้ครบก่อนเปิดรับโดเนท",
    };
  }

  return {
    ok: true,
    value: {
      enabled: body.enabled,
      promptpayType: body.promptpayType,
      promptpayId,
      accountNameTh,
      accountNameEn,
      showAccountName: body.showAccountName,
      minAmountSatang,
    },
  };
}

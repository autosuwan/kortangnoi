import { z } from "zod";

import { parseBahtToSatang } from "@/lib/money";

export const DONOR_NAME_MAX = 30;
export const MESSAGE_MAX = 150;
export const MAX_AMOUNT_SATANG = 10_000_000; // 100,000 บาท
export const DONATION_TTL_MS = 30 * 60 * 1000;
export const QUICK_AMOUNTS_BAHT = [20, 50, 100, 500] as const;

/** ตัด control characters (รวมขึ้นบรรทัดใหม่) และช่องว่างซ้ำ — ข้อความขึ้นจอไลฟ์เป็น text เท่านั้น */
export function cleanDonorText(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const bodySchema = z.object({
  donorName: z.string().max(200),
  amount: z.string().max(20),
  message: z.string().max(1000).nullable().optional(),
  alertStyle: z
    .object({
      mediaUrl: z.unknown().optional(),
      nameColor: z.unknown().optional(),
      supportText: z.unknown().optional(),
    })
    .nullable()
    .optional(),
});

export type DonationInput = {
  donorName: string;
  amountSatang: number;
  message: string | null;
  alertStyle: {
    mediaUrl?: unknown;
    nameColor?: unknown;
    supportText?: unknown;
  } | null;
};

export type DonationErrorCode =
  | "DONATION_INVALID"
  | "DONOR_NAME_INVALID"
  | "MESSAGE_INVALID"
  | "AMOUNT_INVALID"
  | "AMOUNT_TOO_LOW";

export type DonationInputResult =
  | { ok: true; value: DonationInput }
  | { ok: false; code: DonationErrorCode; message: string };

const formatBaht = (satang: number) =>
  (satang / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** ตรวจ body ของการสร้างโดเนท — ใช้ทั้งฟอร์มฝั่ง client และ server (server เป็นตัวตัดสิน) */
export function validateDonationInput(
  input: unknown,
  minAmountSatang: number,
): DonationInputResult {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "DONATION_INVALID", message: "ข้อมูลไม่ถูกต้อง" };
  }
  const body = parsed.data;

  const donorName = cleanDonorText(body.donorName);
  if (donorName.length < 1 || donorName.length > DONOR_NAME_MAX) {
    return {
      ok: false,
      code: "DONOR_NAME_INVALID",
      message: `กรอกชื่อ 1–${DONOR_NAME_MAX} ตัวอักษร`,
    };
  }

  const message = cleanDonorText(body.message ?? "");
  if (message.length > MESSAGE_MAX) {
    return {
      ok: false,
      code: "MESSAGE_INVALID",
      message: `ข้อความยาวได้ไม่เกิน ${MESSAGE_MAX} ตัวอักษร`,
    };
  }

  const amountSatang = parseBahtToSatang(body.amount);
  if (
    amountSatang === null ||
    amountSatang <= 0 ||
    amountSatang > MAX_AMOUNT_SATANG
  ) {
    return {
      ok: false,
      code: "AMOUNT_INVALID",
      message: "ยอดต้องเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง และไม่เกิน 100,000 บาท",
    };
  }
  if (amountSatang < minAmountSatang) {
    return {
      ok: false,
      code: "AMOUNT_TOO_LOW",
      message: `ยอดต้องไม่ต่ำกว่า ${formatBaht(minAmountSatang)} บาท`,
    };
  }

  return {
    ok: true,
    value: {
      donorName,
      amountSatang,
      message: message || null,
      alertStyle: body.alertStyle ?? null,
    },
  };
}

import "server-only";

import { AppError } from "@/lib/api-error";
import {
  validatePaymentSettings,
  type PaymentSettings,
} from "@/lib/payment-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["payment_settings"]["Row"];

const COLUMNS =
  "enabled, promptpay_type, promptpay_id, account_name_th, account_name_en, show_account_name, min_amount_satang, allow_anonymous";

function toSettings(
  row: Pick<
    Row,
    | "enabled"
    | "promptpay_type"
    | "promptpay_id"
    | "account_name_th"
    | "account_name_en"
    | "show_account_name"
    | "min_amount_satang"
    | "allow_anonymous"
  >,
): PaymentSettings {
  return {
    enabled: row.enabled,
    promptpayType: row.promptpay_type,
    promptpayId: row.promptpay_id,
    accountNameTh: row.account_name_th,
    accountNameEn: row.account_name_en,
    showAccountName: row.show_account_name,
    minAmountSatang: row.min_amount_satang,
    allowAnonymous: row.allow_anonymous,
  };
}

export async function getPaymentSettings(
  userId: string,
): Promise<PaymentSettings> {
  const { data, error } = await createAdminClient()
    .from("payment_settings")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");
  return toSettings(data);
}

export async function updatePaymentSettings(
  userId: string,
  input: unknown,
): Promise<PaymentSettings> {
  const result = validatePaymentSettings(input);
  if (!result.ok) throw new AppError(400, result.code, result.message);
  const s = result.value;

  const { data, error } = await createAdminClient()
    .from("payment_settings")
    .update({
      enabled: s.enabled,
      promptpay_type: s.promptpayType,
      promptpay_id: s.promptpayId,
      account_name_th: s.accountNameTh,
      account_name_en: s.accountNameEn,
      show_account_name: s.showAccountName,
      min_amount_satang: s.minAmountSatang,
      allow_anonymous: s.allowAnonymous,
    })
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, "PROFILE_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");
  return toSettings(data);
}

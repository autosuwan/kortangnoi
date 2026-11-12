import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { alertImageUrl, resolveDonorAlertStyle } from "@/lib/alert-settings";
import { AppError } from "@/lib/api-error";
import {
  DONATION_TTL_MS,
  MAX_SLIP_ATTEMPTS,
  validateDonationInput,
  type ReceiverSnapshot,
} from "@/lib/donation";
import { buildPromptpayPayload } from "@/lib/promptpay";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getAlertSettings } from "@/server/services/alert";
import { getPaymentSettings } from "@/server/services/payment";

type DonationStatus = Database["public"]["Enums"]["donation_status"];

const STUCK_VERIFYING_MS = 2 * 60 * 1000;
const RATE_LIMIT = { count: 10, windowMs: 10 * 60 * 1000 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export type PublicStreamer = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  enabled: boolean;
  minAmountSatang: number;
  accountName: string | null;
  alertOptions: {
    canPickImage: boolean;
    canPickColor: boolean;
    canPickSupportText: boolean;
    defaults: { imageUrl: string; nameColor: string; supportText: string };
  };
};

const notFound = () => new AppError(404, "NOT_FOUND", "ไม่พบหน้านี้");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** hash IP ด้วย secret (ไม่เก็บ IP ตรง) — ใช้ IP_HASH_SALT ถ้ามี ไม่งั้นใช้ secret key ของ Supabase */
function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("IP_HASH_SALT or SUPABASE_SECRET_KEY required");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

async function findStreamer(username: string) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id, username, display_name, avatar_url, banner_url, bio")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data?.username) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url,
    bio: data.bio,
  };
}

export async function getPublicStreamer(
  username: string,
): Promise<PublicStreamer | null> {
  const streamer = await findStreamer(username);
  if (!streamer) return null;

  const [payment, alert] = await Promise.all([
    getPaymentSettings(streamer.id),
    getAlertSettings(streamer.id),
  ]);
  return {
    displayName: streamer.displayName || streamer.username,
    username: streamer.username,
    avatarUrl: streamer.avatarUrl,
    bannerUrl: streamer.bannerUrl,
    bio: streamer.bio,
    enabled: payment.enabled,
    minAmountSatang: payment.minAmountSatang,
    accountName: payment.showAccountName ? payment.accountNameTh : null,
    alertOptions: {
      canPickImage: alert.donorCanPickImage,
      canPickColor: alert.donorCanPickColor,
      canPickSupportText: alert.donorCanPickSupportText,
      defaults: {
        imageUrl: alertImageUrl(alert),
        nameColor: alert.nameColor,
        supportText: alert.supportText,
      },
    },
  };
}

export type CreatedDonation = {
  donationId: string;
  accessToken: string;
  amountSatang: number;
  qrPayload: string;
  expiresAt: string;
};

export async function createDonation(
  username: string,
  input: unknown,
  ip: string,
): Promise<CreatedDonation> {
  const streamer = await findStreamer(username);
  if (!streamer) throw notFound();

  const [payment, alert] = await Promise.all([
    getPaymentSettings(streamer.id),
    getAlertSettings(streamer.id),
  ]);
  if (!payment.enabled || !payment.promptpayId) {
    throw new AppError(409, "DONATIONS_DISABLED", "ตอนนี้ปิดรับโดเนท");
  }

  const result = validateDonationInput(input, payment.minAmountSatang);
  if (!result.ok) throw new AppError(400, result.code, result.message);
  const donation = result.value;

  const admin = createAdminClient();
  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();
  const { count, error: countError } = await admin
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("streamer_id", streamer.id)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= RATE_LIMIT.count) {
    throw new AppError(429, "RATE_LIMITED", "สร้างรายการบ่อยเกินไป รอสักครู่");
  }

  const receiver: ReceiverSnapshot = {
    promptpayType: payment.promptpayType,
    promptpayId: payment.promptpayId,
    accountNameTh: payment.accountNameTh,
    accountNameEn: payment.accountNameEn,
    showAccountName: payment.showAccountName,
  };
  // QR ล็อกยอดด้วยเลขพร้อมเพย์ ณ ตอนนี้
  const qrPayload = buildPromptpayPayload({
    type: receiver.promptpayType,
    id: receiver.promptpayId,
    amountSatang: donation.amountSatang,
  });
  const style = resolveDonorAlertStyle(alert, donation.alertStyle);
  const accessToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DONATION_TTL_MS).toISOString();

  const { data, error } = await admin
    .from("donations")
    .insert({
      streamer_id: streamer.id,
      donor_name: donation.donorName,
      message: donation.message,
      amount_satang: donation.amountSatang,
      access_token_hash: sha256(accessToken),
      receiver_snapshot: receiver,
      qr_payload: qrPayload,
      expires_at: expiresAt,
      donor_media_url: style.mediaUrl,
      donor_name_color: style.nameColor,
      donor_support_text: style.supportText,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error) throw error;

  return {
    donationId: data.id,
    accessToken,
    amountSatang: donation.amountSatang,
    qrPayload,
    expiresAt,
  };
}

export type DonorDonationView = {
  status: DonationStatus;
  amountSatang: number;
  expiresAt: string;
  attemptsLeft: number;
  resultMessage: string | null;
  qrPayload: string;
  accountName: string | null;
  streamer: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
  };
};

function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** ผู้บริจาคเปิดดูรายการของตัวเองด้วย token ในลิงก์ — token ผิดตอบ 404 เหมือนไม่มีรายการ */
export async function getDonationForDonor(
  id: string,
  token: string,
): Promise<DonorDonationView> {
  if (!UUID.test(id) || !TOKEN.test(token)) throw notFound();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("donations")
    .select(
      "id, status, amount_satang, expires_at, updated_at, slip_attempts, result_message, qr_payload, receiver_snapshot, access_token_hash, profiles!inner(username, display_name, avatar_url, banner_url, bio)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !tokenMatches(token, data.access_token_hash)) throw notFound();

  let status = data.status;
  // หมดเวลาแบบ lazy: เช็กตอนอ่าน (conditional update กันชนกับการแนบสลิป)
  if (status === "awaiting_slip" && Date.parse(data.expires_at) < Date.now()) {
    const { data: updated } = await admin
      .from("donations")
      .update({ status: "expired" })
      .eq("id", id)
      .eq("status", "awaiting_slip")
      .select("status")
      .maybeSingle();
    status = updated?.status ?? "expired";
  }
  // request ตายกลางทาง (เช่น Vercel timeout) ค้างที่ verifying เกิน 2 นาที → ให้สตรีมเมอร์ตรวจเอง
  if (
    status === "verifying" &&
    Date.now() - Date.parse(data.updated_at) > STUCK_VERIFYING_MS
  ) {
    const message = "ส่งให้สตรีมเมอร์ตรวจสอบแล้ว";
    const { data: updated } = await admin
      .from("donations")
      .update({ status: "pending_review", result_message: message })
      .eq("id", id)
      .eq("status", "verifying")
      .select("status")
      .maybeSingle();
    status = updated?.status ?? status;
    data.result_message = message;
  }

  const receiver = data.receiver_snapshot as unknown as ReceiverSnapshot;
  const profile = data.profiles;
  return {
    status,
    amountSatang: data.amount_satang,
    expiresAt: data.expires_at,
    attemptsLeft: MAX_SLIP_ATTEMPTS - data.slip_attempts,
    resultMessage: data.result_message,
    qrPayload: data.qr_payload,
    accountName: receiver.showAccountName ? receiver.accountNameTh : null,
    streamer: {
      displayName: profile.display_name || profile.username || "",
      username: profile.username ?? "",
      avatarUrl: profile.avatar_url,
      bannerUrl: profile.banner_url,
      bio: profile.bio,
    },
  };
}

/** IP ของผู้เรียก (Vercel ใส่ x-forwarded-for) — ใช้แค่ทำ hash สำหรับ rate limit */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

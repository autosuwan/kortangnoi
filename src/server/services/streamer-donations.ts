import "server-only";

import { AppError } from "@/lib/api-error";
import { bangkokPeriodStarts } from "@/lib/bangkok-time";
import { bankName } from "@/lib/banks";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { verifyReasons } from "@/lib/verify-reason";
import { sendDonationAlert } from "@/server/services/overlay";
import { addDonationTime } from "@/server/services/overlay-widgets";

type DonationStatus = Database["public"]["Enums"]["donation_status"];

export const PAGE_SIZE = 20;
const SLIP_URL_SECONDS = 10 * 60;
const REJECT_REASON_MAX = 200;

/** ตัวกรองในหน้าประวัติ — "all" ไม่รวมรายการที่ยังไม่จ่าย (awaiting_slip/expired) */
export const DONATION_FILTERS = {
  all: ["verifying", "approved", "pending_review", "rejected"],
  pending_review: ["pending_review"],
  approved: ["approved"],
  rejected: ["rejected"],
  unpaid: ["awaiting_slip", "expired"],
} as const satisfies Record<string, readonly DonationStatus[]>;
export type DonationFilter = keyof typeof DONATION_FILTERS;

export type DonationRow = {
  id: string;
  createdAt: string;
  donorName: string;
  amountSatang: number;
  message: string | null;
  status: DonationStatus;
};

export type DonationDetail = DonationRow & {
  resultMessage: string | null;
  reasons: string[];
  approvedVia: "auto" | "manual" | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  slipUrl: string | null;
  /** ข้อมูลจากสลิป (ชื่อจริงผู้โอน) — เห็นเฉพาะเจ้าของ ห้ามส่งไป overlay/webhook */
  slip: {
    senderName: string | null;
    senderNameEn: string | null;
    bank: string | null;
    transferredAt: string | null;
    amountSatang: number | null;
    transRef: string | null;
  } | null;
};

const ROW_COLUMNS =
  "id, created_at, donor_name, amount_satang, message, status";
const notFound = () => new AppError(404, "NOT_FOUND", "ไม่พบรายการนี้");

const toRow = (d: {
  id: string;
  created_at: string;
  donor_name: string;
  amount_satang: number;
  message: string | null;
  status: DonationStatus;
}): DonationRow => ({
  id: d.id,
  createdAt: d.created_at,
  donorName: d.donor_name,
  amountSatang: d.amount_satang,
  message: d.message,
  status: d.status,
});

export function parseFilter(value: string | null): DonationFilter {
  return value && value in DONATION_FILTERS ? (value as DonationFilter) : "all";
}

export async function listDonations(
  userId: string,
  { filter = "all", page = 1 }: { filter?: DonationFilter; page?: number } = {},
): Promise<{
  items: DonationRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * PAGE_SIZE;
  const { data, count, error } = await createAdminClient()
    .from("donations")
    .select(ROW_COLUMNS, { count: "exact" })
    .eq("streamer_id", userId)
    .in("status", [...DONATION_FILTERS[filter]])
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return {
    items: (data ?? []).map(toRow),
    total: count ?? 0,
    page: safePage,
    pageSize: PAGE_SIZE,
  };
}

/** ยอดรวมวันนี้/เดือนนี้ (เวลาไทย) นับเฉพาะ approved + จำนวนรอตรวจ */
export async function getDonationSummary(userId: string, now = new Date()) {
  const { dayStart, monthStart } = bangkokPeriodStarts(now);
  const admin = createAdminClient();
  const [approved, pending] = await Promise.all([
    admin
      .from("donations")
      .select("amount_satang, created_at")
      .eq("streamer_id", userId)
      .eq("status", "approved")
      .gte("created_at", monthStart.toISOString()),
    admin
      .from("donations")
      .select("id", { count: "exact", head: true })
      .eq("streamer_id", userId)
      .eq("status", "pending_review"),
  ]);
  if (approved.error) throw approved.error;
  if (pending.error) throw pending.error;

  let todaySatang = 0;
  let monthSatang = 0;
  for (const d of approved.data ?? []) {
    monthSatang += d.amount_satang;
    if (Date.parse(d.created_at) >= dayStart.getTime())
      todaySatang += d.amount_satang;
  }
  return { todaySatang, monthSatang, pendingCount: pending.count ?? 0 };
}

export async function getDonationDetail(
  userId: string,
  id: string,
): Promise<DonationDetail> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("donations")
    .select(
      `${ROW_COLUMNS}, result_message, verify_result, approved_via, review_note, reviewed_at, slip_storage_path, trans_ref, trans_at`,
    )
    .eq("id", id)
    .eq("streamer_id", userId)
    .maybeSingle();
  if (error && error.code !== "22P02") throw error; // 22P02 = id ไม่ใช่ uuid
  if (!data) throw notFound();

  let slipUrl: string | null = null;
  if (data.slip_storage_path) {
    const signed = await admin.storage
      .from("slips")
      .createSignedUrl(data.slip_storage_path, SLIP_URL_SECONDS);
    slipUrl = signed.data?.signedUrl ?? null;
  }

  const raw = (data.verify_result ?? null) as {
    slip?: {
      amount?: number;
      sendingBank?: string;
      sender?: { displayName?: string; name?: string };
    };
  } | null;
  const s = raw?.slip;

  return {
    ...toRow(data),
    resultMessage: data.result_message,
    reasons: verifyReasons(data.verify_result),
    approvedVia: data.approved_via,
    reviewNote: data.review_note,
    reviewedAt: data.reviewed_at,
    slipUrl,
    slip: s
      ? {
          senderName: s.sender?.displayName ?? null,
          senderNameEn: s.sender?.name ?? null,
          bank: bankName(s.sendingBank),
          transferredAt: data.trans_at,
          amountSatang:
            typeof s.amount === "number" ? Math.round(s.amount * 100) : null,
          transRef: data.trans_ref,
        }
      : null,
  };
}

/** เปลี่ยน pending_review → สถานะใหม่ แบบ conditional (กดซ้ำ/พร้อมกันสำเร็จครั้งเดียว) */
async function review(
  userId: string,
  id: string,
  update: Database["public"]["Tables"]["donations"]["Update"],
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("donations")
    .update({ ...update, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("streamer_id", userId)
    .eq("status", "pending_review")
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") {
    throw new AppError(409, "SLIP_ALREADY_USED", "สลิปนี้ถูกใช้ไปแล้ว");
  }
  if (error && error.code !== "22P02") throw error;
  if (data) return;

  // ไม่ได้แถว: ไม่ใช่ของเรา (404) หรือสถานะเปลี่ยนไปแล้ว (409)
  await getDonationDetail(userId, id);
  throw new AppError(409, "INVALID_STATUS", "รายการนี้ไม่ได้รอตรวจแล้ว");
}

export async function approveDonation(userId: string, id: string) {
  await review(userId, id, {
    status: "approved",
    approved_via: "manual",
    result_message: "สตรีมเมอร์อนุมัติแล้ว ขอบคุณ!",
  });
  // subathon ก่อน alert: widget ดึงใหม่ตอนได้ event donation จะเห็นเวลาใหม่
  await addDonationTime(id).catch((e) =>
    console.error("add subathon time failed", e),
  );
  await sendDonationAlert(id).catch((e) =>
    console.error("send donation alert failed", e),
  );
  return getDonationDetail(userId, id);
}

export async function rejectDonation(
  userId: string,
  id: string,
  input: unknown,
) {
  const reasonRaw = (input as { reason?: unknown } | null)?.reason;
  const reason =
    typeof reasonRaw === "string"
      ? reasonRaw.trim().slice(0, REJECT_REASON_MAX)
      : "";
  await review(userId, id, {
    status: "rejected",
    review_note: reason || null,
    result_message: reason
      ? `สตรีมเมอร์ไม่อนุมัติ: ${reason}`
      : "สตรีมเมอร์ไม่อนุมัติรายการนี้",
  });
  return getDonationDetail(userId, id);
}

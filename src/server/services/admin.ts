import "server-only";

import { AppError } from "@/lib/api-error";
import { bangkokPeriodStarts } from "@/lib/bangkok-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/server/auth";

/** ไม่ใช่แอดมิน → 404 (ไม่บอกว่ามีหน้านี้) */
export function assertAdmin(userId: string) {
  if (!isAdmin(userId)) throw new AppError(404, "NOT_FOUND", "ไม่พบหน้านี้");
}

export type AdminStats = {
  monthChecks: { approved: number; pendingReview: number; rejected: number };
  recentErrors: {
    id: number;
    source: string;
    code: string;
    message: string;
    createdAt: string;
  }[];
};

/** สถิติการตรวจสลิปเดือนนี้ (เวลาไทย, เฉพาะรายการที่แนบสลิปแล้ว) + error ระดับระบบล่าสุด */
export async function getAdminStats(now = new Date()): Promise<AdminStats> {
  const { monthStart } = bangkokPeriodStarts(now);
  const admin = createAdminClient();
  const count = (status: "approved" | "pending_review" | "rejected") =>
    admin
      .from("donations")
      .select("id", { count: "exact", head: true })
      .eq("status", status)
      .gt("slip_attempts", 0)
      .gte("created_at", monthStart.toISOString());

  const [approved, pending, rejected, errors] = await Promise.all([
    count("approved"),
    count("pending_review"),
    count("rejected"),
    admin
      .from("system_errors")
      .select("id, source, code, message, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  for (const r of [approved, pending, rejected, errors])
    if (r.error) throw r.error;

  return {
    monthChecks: {
      approved: approved.count ?? 0,
      pendingReview: pending.count ?? 0,
      rejected: rejected.count ?? 0,
    },
    recentErrors: (errors.data ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      code: e.code,
      message: e.message,
      createdAt: e.created_at,
    })),
  };
}

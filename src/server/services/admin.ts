import "server-only";

import { AppError } from "@/lib/api-error";
import { bangkokPeriodStarts } from "@/lib/bangkok-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_NOTE_MAX } from "@/lib/application";
import { isAdmin, type StreamerStatus } from "@/server/auth";
import { readApplication } from "@/server/services/application";

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

// ---- จัดการผู้ใช้ (F15) ----

export type AdminUserRow = {
  id: string;
  displayName: string | null;
  username: string | null;
  status: StreamerStatus;
  note: string | null;
  createdAt: string;
  submittedAt: string | null;
  /** ชื่อจริงจากใบสมัคร (แอดมินเท่านั้น) */
  applicantName: string | null;
  donationsEnabled: boolean;
  monthSatang: number;
  monthCount: number;
};

const USERS_PAGE_SIZE = 20;

export async function listUsers(
  {
    q = "",
    status,
    page = 1,
  }: {
    q?: string;
    status?: StreamerStatus | null;
    page?: number;
  },
  now = new Date(),
) {
  const admin = createAdminClient();
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * USERS_PAGE_SIZE;
  let query = admin
    .from("profiles")
    .select(
      "id, display_name, username, streamer_status, status_note, created_at, streamer_applications(submitted_at, real_name), payment_settings(enabled)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + USERS_PAGE_SIZE - 1);
  if (status) query = query.eq("streamer_status", status);
  // ค้นหาด้วยชื่อที่แสดง/username (ตัด , ( ) ที่มีความหมายใน filter ของ PostgREST)
  const term = q
    .trim()
    .replace(/[,()%*\\]/g, "")
    .slice(0, 40);
  if (term) {
    query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
  }
  const { data, count, error } = await query;
  if (error) throw error;

  const ids = (data ?? []).map((u) => u.id);
  const totals = new Map<string, { satang: number; count: number }>();
  if (ids.length) {
    const { monthStart } = bangkokPeriodStarts(now);
    const { data: rows, error: dError } = await admin
      .from("donations")
      .select("streamer_id, amount_satang")
      .in("streamer_id", ids)
      .eq("status", "approved")
      .gte("created_at", monthStart.toISOString());
    if (dError) throw dError;
    for (const r of rows ?? []) {
      const t = totals.get(r.streamer_id) ?? { satang: 0, count: 0 };
      t.satang += r.amount_satang;
      t.count += 1;
      totals.set(r.streamer_id, t);
    }
  }

  const one = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;
  return {
    items: (data ?? []).map((u): AdminUserRow => ({
      id: u.id,
      displayName: u.display_name,
      username: u.username,
      status: isAdmin(u.id) ? "approved" : u.streamer_status,
      note: u.status_note,
      createdAt: u.created_at,
      submittedAt: one(u.streamer_applications)?.submitted_at ?? null,
      applicantName: one(u.streamer_applications)?.real_name ?? null,
      donationsEnabled: one(u.payment_settings)?.enabled ?? false,
      monthSatang: totals.get(u.id)?.satang ?? 0,
      monthCount: totals.get(u.id)?.count ?? 0,
    })),
    total: count ?? 0,
    page: safePage,
    pageSize: USERS_PAGE_SIZE,
  };
}

export async function countUsersByStatus(): Promise<
  Record<StreamerStatus, number>
> {
  const admin = createAdminClient();
  const statuses: StreamerStatus[] = [
    "pending_application",
    "pending",
    "approved",
    "rejected",
    "suspended",
  ];
  const counts = await Promise.all(
    statuses.map((s) =>
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("streamer_status", s),
    ),
  );
  return Object.fromEntries(
    statuses.map((s, i) => [s, counts[i].count ?? 0]),
  ) as Record<StreamerStatus, number>;
}

export async function getUserDetail(id: string) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(
      "id, display_name, username, real_name, streamer_status, status_note, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) throw new AppError(404, "NOT_FOUND", "ไม่พบผู้ใช้นี้");
  return {
    id: data.id,
    displayName: data.display_name,
    username: data.username,
    accountName: data.real_name,
    status: (isAdmin(data.id)
      ? "approved"
      : data.streamer_status) as StreamerStatus,
    note: data.status_note,
    createdAt: data.created_at,
    isAdmin: isAdmin(data.id),
    application: await readApplication(data.id),
  };
}

export const USER_ACTIONS = {
  approve: { from: ["pending"], to: "approved" },
  reject: { from: ["pending"], to: "rejected" },
  suspend: { from: ["approved"], to: "suspended" },
  unsuspend: { from: ["suspended"], to: "approved" },
} as const satisfies Record<
  string,
  { from: StreamerStatus[]; to: StreamerStatus }
>;
export type UserAction = keyof typeof USER_ACTIONS;

/** เปลี่ยนสถานะผู้ใช้แบบ conditional (กดซ้ำ/พร้อมกันสำเร็จครั้งเดียว) */
export async function changeUserStatus(
  adminId: string,
  userId: string,
  action: string,
  input: unknown,
) {
  if (!(action in USER_ACTIONS)) {
    throw new AppError(404, "NOT_FOUND", "ไม่พบหน้านี้");
  }
  const rule = USER_ACTIONS[action as UserAction];
  if (isAdmin(userId) || userId === adminId) {
    throw new AppError(409, "INVALID_STATUS", "เปลี่ยนสถานะแอดมินไม่ได้");
  }
  const raw = (input as { note?: unknown } | null)?.note;
  const note =
    typeof raw === "string"
      ? raw.trim().slice(0, STATUS_NOTE_MAX) || null
      : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      streamer_status: rule.to,
      status_note: rule.to === "approved" ? null : note,
    })
    .eq("id", userId)
    .in("streamer_status", [...rule.from])
    .select("id");
  if (error && error.code !== "22P02") throw error;
  if (!data?.length) {
    await getUserDetail(userId); // ไม่มีผู้ใช้ → 404
    throw new AppError(409, "INVALID_STATUS", "สถานะผู้ใช้เปลี่ยนไปแล้ว");
  }
  if (action === "approve" || action === "reject") {
    await admin
      .from("streamer_applications")
      .update({ reviewed_at: new Date().toISOString(), reviewed_by: adminId })
      .eq("user_id", userId);
  }
  return getUserDetail(userId);
}

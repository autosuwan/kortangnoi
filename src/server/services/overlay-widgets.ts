import "server-only";

import { AppError } from "@/lib/api-error";
import { bangkokPeriodStarts } from "@/lib/bangkok-time";
import { publicEnv } from "@/lib/env";
import { OVERLAY_TOKEN_PATTERN } from "@/lib/overlay";
import {
  overlayWidgetInputSchema,
  rankDonors,
  resolveStyles,
  subathonSecondsFor,
  timerControlSchema,
  timerState,
  type TimerData,
  type GoalData,
  type OverlayWidgetSettings,
  type QrData,
  type RecentData,
  type TopData,
  type TopPeriod,
  type WidgetData,
  type WidgetKind,
} from "@/lib/overlay-widgets";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { notifyOverlaySettingsChanged } from "@/server/realtime/overlay";

type Row = Database["public"]["Tables"]["overlay_widgets"]["Row"];

const COLUMNS =
  "goal_title, goal_target_satang, goal_started_at, qr_caption, top_period, top_count, recent_count, timer_initial_sec, timer_step_satang, timer_step_seconds, timer_label, styles";

const TIMER_COLUMNS =
  "timer_status, timer_ends_at, timer_remaining_sec, timer_initial_sec, timer_label";

type SettingsRow = Pick<
  Row,
  | "goal_title"
  | "goal_target_satang"
  | "goal_started_at"
  | "qr_caption"
  | "top_period"
  | "top_count"
  | "recent_count"
  | "timer_initial_sec"
  | "timer_step_satang"
  | "timer_step_seconds"
  | "timer_label"
  | "styles"
>;

const toSettings = (r: SettingsRow) =>
  ({
    goalTitle: r.goal_title,
    goalTargetSatang: r.goal_target_satang,
    goalStartedAt: r.goal_started_at,
    qrCaption: r.qr_caption,
    topPeriod: r.top_period as TopPeriod,
    topCount: r.top_count,
    recentCount: r.recent_count,
    timerInitialSec: r.timer_initial_sec,
    timerStepSatang: r.timer_step_satang,
    timerStepSeconds: r.timer_step_seconds,
    timerLabel: r.timer_label,
    styles: resolveStyles(r.styles),
  }) satisfies OverlayWidgetSettings;

export async function getOverlayWidgetSettings(
  userId: string,
): Promise<OverlayWidgetSettings> {
  const { data, error } = await createAdminClient()
    .from("overlay_widgets")
    .select(COLUMNS)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return toSettings(data);
}

export async function updateOverlayWidgetSettings(
  userId: string,
  input: unknown,
): Promise<OverlayWidgetSettings> {
  const parsed = overlayWidgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, "OVERLAY_WIDGETS_INVALID", "ค่าที่ตั้งไม่ถูกต้อง");
  }
  const v = parsed.data;
  const { data, error } = await createAdminClient()
    .from("overlay_widgets")
    .update({
      goal_title: v.goalTitle,
      goal_target_satang: v.goalTargetSatang,
      qr_caption: v.qrCaption,
      top_period: v.topPeriod,
      top_count: v.topCount,
      recent_count: v.recentCount,
      timer_initial_sec: v.timerInitialSec,
      timer_step_satang: v.timerStepSatang,
      timer_step_seconds: v.timerStepSeconds,
      timer_label: v.timerLabel,
      styles: v.styles,
    })
    .eq("user_id", userId)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  await notifyOverlaySettingsChanged(userId);
  return toSettings(data);
}

/** เริ่มนับ goal ใหม่จากตอนนี้ */
export async function resetGoal(
  userId: string,
): Promise<OverlayWidgetSettings> {
  const { data, error } = await createAdminClient()
    .from("overlay_widgets")
    .update({ goal_started_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  await notifyOverlaySettingsChanged(userId);
  return toSettings(data);
}

// ---- Subathon timer ----

async function readTimer(userId: string): Promise<TimerData> {
  const { data, error } = await createAdminClient()
    .from("overlay_widgets")
    .select(`${TIMER_COLUMNS}, styles`)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return {
    ...timerState({
      status: data.timer_status as "idle" | "running" | "paused",
      endsAt: data.timer_ends_at,
      remainingSec: data.timer_remaining_sec,
      initialSec: data.timer_initial_sec,
    }),
    label: data.timer_label,
    style: resolveStyles(data.styles).timer,
  };
}

/** สถานะ timer สำหรับ dashboard */
export const getTimer = readTimer;

/** ปุ่มควบคุม: start | pause | resume | reset | adjust */
export async function controlTimer(
  userId: string,
  input: unknown,
): Promise<TimerData> {
  const parsed = timerControlSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, "TIMER_ACTION_INVALID", "คำสั่งไม่ถูกต้อง");
  }
  const { data, error } = await createAdminClient().rpc("subathon_control", {
    p_user: userId,
    p_action: parsed.data.action,
    p_seconds: parsed.data.action === "adjust" ? parsed.data.seconds : 0,
  });
  if (error) throw error;
  if (!data) {
    throw new AppError(409, "TIMER_INVALID_STATE", "ทำไม่ได้ในสถานะตอนนี้");
  }
  await notifyOverlaySettingsChanged(userId);
  return readTimer(userId);
}

/**
 * โดเนทผ่านแล้ว → เพิ่มเวลา subathon ตามกฎ (เฉพาะตอนกำลังนับ/หยุดชั่วคราว)
 * เรียกก่อนส่ง alert เพื่อให้ widget ที่ดึงใหม่ตอนได้ event donation เห็นเวลาใหม่
 */
export async function addDonationTime(donationId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: d, error } = await admin
    .from("donations")
    .select("streamer_id, amount_satang, status")
    .eq("id", donationId)
    .single();
  if (error) throw error;
  if (d.status !== "approved") return 0;
  const s = await getOverlayWidgetSettings(d.streamer_id);
  const seconds = subathonSecondsFor(
    d.amount_satang,
    s.timerStepSatang,
    s.timerStepSeconds,
  );
  if (seconds <= 0) return 0;
  const { data: added, error: rpcError } = await admin.rpc(
    "subathon_add_seconds",
    { p_user: d.streamer_id, p_seconds: seconds },
  );
  if (rpcError) throw rpcError;
  return added ? seconds : 0;
}

const invalidLink = () =>
  new AppError(404, "OVERLAY_NOT_FOUND", "ลิงก์ overlay ไม่ถูกต้อง");

/**
 * ข้อมูล widget สำหรับหน้า overlay (ไม่ล็อกอิน ใช้ token)
 * ส่งออกเฉพาะชื่อที่ผู้บริจาคกรอก + ยอด — ไม่มีชื่อจริง/ข้อมูลสลิป/ข้อความ
 */
export async function getWidgetData<K extends WidgetKind>(
  token: string,
  kind: K,
  now = new Date(),
): Promise<WidgetData[K]> {
  if (!OVERLAY_TOKEN_PATTERN.test(token)) throw invalidLink();
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, username")
    .eq("overlay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw invalidLink();

  const s = await getOverlayWidgetSettings(profile.id);
  const approved = () =>
    admin
      .from("donations")
      .select("id, donor_name, amount_satang")
      .eq("streamer_id", profile.id)
      .eq("status", "approved");

  switch (kind) {
    case "goal": {
      const { data, error } = await approved().gte(
        "created_at",
        s.goalStartedAt,
      );
      if (error) throw error;
      const currentSatang = (data ?? []).reduce(
        (sum, d) => sum + d.amount_satang,
        0,
      );
      return {
        title: s.goalTitle,
        targetSatang: s.goalTargetSatang,
        currentSatang,
        style: s.styles.goal,
      } satisfies GoalData as WidgetData[K];
    }
    case "qr": {
      const site = publicEnv.siteUrl.replace(/\/$/, "");
      return {
        caption: s.qrCaption,
        donateUrl: `${site}/${profile.username ?? ""}`,
        style: s.styles.qr,
      } satisfies QrData as WidgetData[K];
    }
    case "top": {
      const { dayStart, monthStart } = bangkokPeriodStarts(now);
      let q = approved().order("created_at", { ascending: false });
      if (s.topPeriod === "today")
        q = q.gte("created_at", dayStart.toISOString());
      if (s.topPeriod === "month")
        q = q.gte("created_at", monthStart.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return {
        period: s.topPeriod,
        items: rankDonors(
          (data ?? []).map((d) => ({
            donorName: d.donor_name,
            amountSatang: d.amount_satang,
          })),
          s.topCount,
        ),
        style: s.styles.top,
      } satisfies TopData as WidgetData[K];
    }
    case "timer":
      return (await readTimer(profile.id)) satisfies TimerData as WidgetData[K];
    case "recent": {
      const { data, error } = await approved()
        .order("created_at", { ascending: false })
        .limit(s.recentCount);
      if (error) throw error;
      return {
        items: (data ?? []).map((d) => ({
          id: d.id,
          name: d.donor_name,
          amountSatang: d.amount_satang,
        })),
        style: s.styles.recent,
      } satisfies RecentData as WidgetData[K];
    }
  }
  throw invalidLink();
}

import "server-only";

import { AppError } from "@/lib/api-error";
import { bangkokPeriodStarts } from "@/lib/bangkok-time";
import { publicEnv } from "@/lib/env";
import { OVERLAY_TOKEN_PATTERN } from "@/lib/overlay";
import {
  overlayWidgetInputSchema,
  rankDonors,
  resolveStyles,
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
  "goal_title, goal_target_satang, goal_started_at, qr_caption, top_period, top_count, recent_count, styles";

const toSettings = (r: Omit<Row, "user_id" | "updated_at">) =>
  ({
    goalTitle: r.goal_title,
    goalTargetSatang: r.goal_target_satang,
    goalStartedAt: r.goal_started_at,
    qrCaption: r.qr_caption,
    topPeriod: r.top_period as TopPeriod,
    topCount: r.top_count,
    recentCount: r.recent_count,
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

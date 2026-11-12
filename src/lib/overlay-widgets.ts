import { z } from "zod";

import {
  ANONYMOUS_NAME,
  cleanDonorText,
  MAX_AMOUNT_SATANG,
} from "@/lib/donation";

/** F14 widget บน OBS นอกจาก alert */
export const WIDGET_KINDS = ["goal", "qr", "top", "recent"] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

export const TOP_PERIODS = ["today", "month", "all"] as const;
export type TopPeriod = (typeof TOP_PERIODS)[number];

export const TOP_PERIOD_LABELS: Record<TopPeriod, string> = {
  today: "วันนี้",
  month: "เดือนนี้",
  all: "ทั้งหมด",
};

export const WIDGET_TEXT_MAX = 40;
export const GOAL_TARGET_SATANG = { min: 100, max: MAX_AMOUNT_SATANG };
export const TOP_COUNT = { min: 3, max: 10 };
export const RECENT_COUNT = { min: 3, max: 20 };

/** ขนาด Browser Source ที่แนะนำใน OBS */
export const WIDGET_SIZES: Record<
  WidgetKind,
  { width: number; height: number }
> = {
  goal: { width: 800, height: 160 },
  qr: { width: 320, height: 400 },
  top: { width: 400, height: 480 },
  recent: { width: 1280, height: 80 },
};

export type OverlayWidgetSettings = {
  goalTitle: string;
  goalTargetSatang: number;
  goalStartedAt: string;
  qrCaption: string;
  topPeriod: TopPeriod;
  topCount: number;
  recentCount: number;
};

export type OverlayWidgetInput = Omit<OverlayWidgetSettings, "goalStartedAt">;

const text = z
  .string()
  .transform(cleanDonorText)
  .pipe(z.string().min(1).max(WIDGET_TEXT_MAX));

export const overlayWidgetInputSchema = z.object({
  goalTitle: text,
  goalTargetSatang: z
    .number()
    .int()
    .min(GOAL_TARGET_SATANG.min)
    .max(GOAL_TARGET_SATANG.max),
  qrCaption: text,
  topPeriod: z.enum(TOP_PERIODS),
  topCount: z.number().int().min(TOP_COUNT.min).max(TOP_COUNT.max),
  recentCount: z.number().int().min(RECENT_COUNT.min).max(RECENT_COUNT.max),
});

// ---- ข้อมูลที่ widget แสดง (ส่งออกไป overlay: ชื่อที่ผู้บริจาคกรอก + ยอดเท่านั้น) ----

export type GoalData = {
  title: string;
  targetSatang: number;
  currentSatang: number;
};
export type QrData = { caption: string; donateUrl: string };
export type TopItem = { name: string; totalSatang: number };
export type TopData = { period: TopPeriod; items: TopItem[] };
export type RecentItem = { id: string; name: string; amountSatang: number };
export type RecentData = { items: RecentItem[] };

export type WidgetData = {
  goal: GoalData;
  qr: QrData;
  top: TopData;
  recent: RecentData;
};

/** % ความคืบหน้า goal (0–100 ปัดลง ไม่ให้ขึ้น 100 ก่อนครบจริง) */
export function goalPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((current / target) * 100)));
}

/**
 * รวมยอดตามชื่อ (trim, ไม่สนตัวพิมพ์) ไม่รวม Anonymous
 * rows เรียงใหม่ → เก่า: ชื่อที่แสดงใช้ตัวสะกดจากรายการล่าสุด
 * ยอดเท่ากัน → คนที่ถึงยอดนั้นก่อน (รายการล่าสุดเก่ากว่า) อยู่ก่อน
 */
export function rankDonors(
  rows: { donorName: string; amountSatang: number }[],
  limit: number,
): TopItem[] {
  const totals = new Map<string, TopItem & { order: number }>();
  rows.forEach((r, i) => {
    const name = r.donorName.trim();
    if (!name || name.toLowerCase() === ANONYMOUS_NAME.toLowerCase()) return;
    const key = name.toLocaleLowerCase("th");
    const cur = totals.get(key);
    if (cur) cur.totalSatang += r.amountSatang;
    else totals.set(key, { name, totalSatang: r.amountSatang, order: i });
  });
  return [...totals.values()]
    .sort((a, b) => b.totalSatang - a.totalSatang || b.order - a.order)
    .slice(0, limit)
    .map(({ name, totalSatang }) => ({ name, totalSatang }));
}

/** ข้อมูลตัวอย่างสำหรับพรีวิวใน dashboard */
export const SAMPLE_DONORS = [
  { name: "ผู้ชมใจดี", amountSatang: 50000 },
  { name: "แมวส้ม", amountSatang: 10000 },
  { name: "Anonymous", amountSatang: 2000 },
  { name: "น้องหมี", amountSatang: 30000 },
  { name: "เพื่อนสายฟ้า", amountSatang: 5000 },
];

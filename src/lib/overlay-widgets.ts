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

// ---- หน้าตา (สี/ขนาด) ต่อ widget — เก็บใน overlay_widgets.styles (jsonb) ----

export const SIZE_STEPS = ["sm", "md", "lg"] as const;
export type SizeStep = (typeof SIZE_STEPS)[number];
export const SIZE_LABELS: Record<SizeStep, string> = {
  sm: "เล็ก",
  md: "กลาง",
  lg: "ใหญ่",
};
/** ตัวคูณขนาดตัวอักษร */
export const TEXT_SCALE: Record<SizeStep, number> = { sm: 0.8, md: 1, lg: 1.3 };

export const SPEEDS = ["slow", "normal", "fast"] as const;
export type Speed = (typeof SPEEDS)[number];
export const SPEED_LABELS: Record<Speed, string> = {
  slow: "ช้า",
  normal: "ปกติ",
  fast: "เร็ว",
};
/** วินาทีต่อ 1 รายการของแถบวิ่ง */
export const SPEED_SECONDS: Record<Speed, number> = {
  slow: 7,
  normal: 5,
  fast: 3,
};

export const GOAL_WIDTH = { min: 300, max: 1200 };
/** ความสูงหลอด goal (px) */
export const BAR_HEIGHT: Record<SizeStep, number> = { sm: 14, md: 26, lg: 40 };
/** ขนาดรูป QR (px) */
export const QR_SIZE: Record<SizeStep, number> = { sm: 160, md: 208, lg: 256 };

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((v) => v.toUpperCase());
const size = z.enum(SIZE_STEPS);
const titleText = z
  .string()
  .transform(cleanDonorText)
  .pipe(z.string().min(1).max(WIDGET_TEXT_MAX));

const common = { textSize: size, textColor: hex, amountColor: hex };

export const widgetStyleSchemas = {
  goal: z.object({
    ...common,
    width: z.number().int().min(GOAL_WIDTH.min).max(GOAL_WIDTH.max),
    barHeight: size,
    barFrom: hex,
    barTo: hex,
    trackColor: hex,
    showPercent: z.boolean(),
    showAmount: z.boolean(),
  }),
  qr: z.object({ ...common, borderColor: hex, size }),
  top: z.object({ ...common, title: titleText, nameColor: hex }),
  recent: z.object({
    ...common,
    speed: z.enum(SPEEDS),
    showBackground: z.boolean(),
    backgroundColor: hex,
  }),
};

export type WidgetStyles = {
  [K in WidgetKind]: z.infer<(typeof widgetStyleSchemas)[K]>;
};
export type GoalStyle = WidgetStyles["goal"];
export type QrStyle = WidgetStyles["qr"];
export type TopStyle = WidgetStyles["top"];
export type RecentStyle = WidgetStyles["recent"];

const AMOUNT_ORANGE = "#F97316";

export const DEFAULT_STYLES: WidgetStyles = {
  goal: {
    textSize: "md",
    textColor: "#FFFFFF",
    amountColor: AMOUNT_ORANGE,
    width: 600,
    barHeight: "md",
    barFrom: "#FBBF24",
    barTo: AMOUNT_ORANGE,
    trackColor: "#262626",
    showPercent: true,
    showAmount: true,
  },
  qr: {
    textSize: "md",
    textColor: "#171717",
    amountColor: AMOUNT_ORANGE,
    borderColor: AMOUNT_ORANGE,
    size: "md",
  },
  top: {
    textSize: "md",
    textColor: "#FFFFFF",
    amountColor: AMOUNT_ORANGE,
    title: "Top ผู้สนับสนุน",
    nameColor: "#FFFFFF",
  },
  recent: {
    textSize: "md",
    textColor: "#FFFFFF",
    amountColor: AMOUNT_ORANGE,
    speed: "normal",
    showBackground: true,
    backgroundColor: "#000000",
  },
};

export const widgetStylesSchema = z.object(widgetStyleSchemas);

/**
 * ค่าจากฐานข้อมูล (jsonb อะไรก็ได้) → styles ครบทุกช่อง
 * ช่องที่ขาด/ผิดใช้ค่าเริ่มต้นทีละช่อง (ค่าอื่นที่ถูกยังอยู่)
 */
export function resolveStyles(raw: unknown): WidgetStyles {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const out = {} as Record<WidgetKind, Record<string, unknown>>;
  for (const kind of WIDGET_KINDS) {
    const given = (
      src[kind] && typeof src[kind] === "object" ? src[kind] : {}
    ) as Record<string, unknown>;
    const shape = widgetStyleSchemas[kind].shape as Record<string, z.ZodType>;
    const defaults = DEFAULT_STYLES[kind] as Record<string, unknown>;
    out[kind] = {};
    for (const key of Object.keys(defaults)) {
      const parsed = shape[key].safeParse(given[key]);
      out[kind][key] = parsed.success ? parsed.data : defaults[key];
    }
  }
  return out as unknown as WidgetStyles;
}

/** ขนาด Browser Source ที่แนะนำใน OBS — คำนวณจากหน้าตาที่ตั้ง */
export function widgetSize(
  kind: WidgetKind,
  styles: WidgetStyles,
): { width: number; height: number } {
  switch (kind) {
    case "goal": {
      const s = styles.goal;
      const text = TEXT_SCALE[s.textSize];
      return {
        width: s.width + 40,
        height: Math.round(40 + 40 * text + BAR_HEIGHT[s.barHeight]),
      };
    }
    case "qr": {
      const s = styles.qr;
      const img = QR_SIZE[s.size];
      return {
        width: img + 80,
        height: Math.round(img + 130 * TEXT_SCALE[s.textSize]),
      };
    }
    case "top": {
      const text = TEXT_SCALE[styles.top.textSize];
      return { width: Math.round(400 * text), height: Math.round(480 * text) };
    }
    case "recent":
      return {
        width: 1280,
        height: Math.round(80 * TEXT_SCALE[styles.recent.textSize]),
      };
  }
}

export type OverlayWidgetSettings = {
  goalTitle: string;
  goalTargetSatang: number;
  goalStartedAt: string;
  qrCaption: string;
  topPeriod: TopPeriod;
  topCount: number;
  recentCount: number;
  styles: WidgetStyles;
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
  styles: widgetStylesSchema,
});

// ---- ข้อมูลที่ widget แสดง (ส่งออกไป overlay: ชื่อที่ผู้บริจาคกรอก + ยอดเท่านั้น) ----

export type GoalData = {
  title: string;
  targetSatang: number;
  currentSatang: number;
  style: GoalStyle;
};
export type QrData = { caption: string; donateUrl: string; style: QrStyle };
export type TopItem = { name: string; totalSatang: number };
export type TopData = { period: TopPeriod; items: TopItem[]; style: TopStyle };
export type RecentItem = { id: string; name: string; amountSatang: number };
export type RecentData = { items: RecentItem[]; style: RecentStyle };

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

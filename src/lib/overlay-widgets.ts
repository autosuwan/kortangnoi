import { z } from "zod";

import {
  ANONYMOUS_NAME,
  cleanDonorText,
  MAX_AMOUNT_SATANG,
} from "@/lib/donation";

/** F14 widget บน OBS นอกจาก alert */
export const WIDGET_KINDS = [
  "goal",
  "qr",
  "top",
  "recent",
  "timer",
  "avatar",
] as const;
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
/** Subathon: เวลาตั้งต้น 1 นาที–24 ชม. (ค่าเริ่มต้น 1 ชม.) */
export const TIMER_INITIAL_SEC = { min: 60, max: 86400 };
export const TIMER_STEP_SATANG = { min: 100, max: MAX_AMOUNT_SATANG };
export const TIMER_STEP_SECONDS = { min: 1, max: 86400 };
/** auto = โดเนทผ่านแล้วปรับเวลาทันที · manual = สตรีมเมอร์กด "ใช้กับ timer" ในประวัติเอง */
export const TIMER_MODES = ["auto", "manual"] as const;
export type TimerMode = (typeof TIMER_MODES)[number];
/** คนดูเลือกบนหน้าโดเนท: เพิ่ม/ลดเวลา */
export const TIMER_DIRECTIONS = ["add", "subtract"] as const;
export type TimerDirection = (typeof TIMER_DIRECTIONS)[number];

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
/** Avatar: ความสูงรูป (px), ความไว/เกณฑ์ระดับเสียง (1–100), ความมืดตอนเงียบ (%) */
export const AVATAR_HEIGHT = { min: 200, max: 1000 };
export const AVATAR_THRESHOLD = { min: 1, max: 100 };
export const AVATAR_DIM = { min: 0, max: 60 };
/** ความสูงการเด้ง (% ของความสูงรูป) */
export const AVATAR_HOP: Record<SizeStep, number> = { sm: 3, md: 6, lg: 10 };
/** เงียบลงแล้วค้างรูปพูดไว้อีกนิด กันปากกระพริบระหว่างคำ */
export const AVATAR_HOLD_MS = 200;
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
  // showBackground = การ์ดขาว+กรอบ (ปิดแล้ว QR ยังมีขอบขาวบางๆ ให้สแกนได้)
  qr: z.object({
    ...common,
    borderColor: hex,
    size,
    showBackground: z.boolean(),
    showCaption: z.boolean(),
    showUrl: z.boolean(),
  }),
  top: z.object({ ...common, title: titleText, nameColor: hex }),
  recent: z.object({
    ...common,
    speed: z.enum(SPEEDS),
    showBackground: z.boolean(),
    backgroundColor: hex,
  }),
  avatar: z.object({
    height: z.number().int().min(AVATAR_HEIGHT.min).max(AVATAR_HEIGHT.max),
    threshold: z
      .number()
      .int()
      .min(AVATAR_THRESHOLD.min)
      .max(AVATAR_THRESHOLD.max),
    dim: z.number().int().min(AVATAR_DIM.min).max(AVATAR_DIM.max),
    bounce: z.boolean(),
    bounceSize: size,
  }),
  // textColor = สีเวลา, amountColor = สี "+เวลา"
  timer: z.object({
    ...common,
    labelColor: hex,
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
export type TimerStyle = WidgetStyles["timer"];
export type AvatarStyle = WidgetStyles["avatar"];

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
    showBackground: true,
    showCaption: true,
    showUrl: true,
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
  timer: {
    textSize: "md",
    textColor: "#FFFFFF",
    amountColor: "#22C55E",
    labelColor: AMOUNT_ORANGE,
    showBackground: true,
    backgroundColor: "#000000",
  },
  avatar: {
    height: 400,
    threshold: 15,
    dim: 25,
    bounce: true,
    bounceSize: "md",
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
      const text = TEXT_SCALE[s.textSize];
      const lines =
        (s.showCaption ? 50 * text : 0) + (s.showUrl ? 30 * text : 0);
      return {
        width: img + 80,
        height: Math.round(img + 80 + lines),
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
    case "timer": {
      const text = TEXT_SCALE[styles.timer.textSize];
      return { width: Math.round(480 * text), height: Math.round(200 * text) };
    }
    case "avatar": {
      const s = styles.avatar;
      // เผื่อที่ด้านบนให้เด้งไม่โดนตัด
      const room = Math.ceil((s.height * AVATAR_HOP.lg) / 100) + 20;
      return { width: s.height + 40, height: s.height + room };
    }
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
  timerInitialSec: number;
  timerStepSatang: number;
  timerStepSeconds: number;
  timerLabel: string;
  timerMode: TimerMode;
  timerAllowSubtract: boolean;
  /** รูป avatar (อัปโหลดผ่าน API แยก ไม่ได้มาจาก PUT) */
  avatarIdleUrl: string | null;
  avatarSpeakUrl: string | null;
  styles: WidgetStyles;
};

export type OverlayWidgetInput = Omit<
  OverlayWidgetSettings,
  "goalStartedAt" | "avatarIdleUrl" | "avatarSpeakUrl"
>;

export const AVATAR_SLOTS = ["idle", "speak"] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

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
  timerInitialSec: z
    .number()
    .int()
    .min(TIMER_INITIAL_SEC.min)
    .max(TIMER_INITIAL_SEC.max),
  timerStepSatang: z
    .number()
    .int()
    .min(TIMER_STEP_SATANG.min)
    .max(TIMER_STEP_SATANG.max),
  timerStepSeconds: z
    .number()
    .int()
    .min(TIMER_STEP_SECONDS.min)
    .max(TIMER_STEP_SECONDS.max),
  timerLabel: text,
  timerMode: z.enum(TIMER_MODES),
  timerAllowSubtract: z.boolean(),
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
/** สถานะที่ผู้ชมเห็น: ended = กำลังนับแต่เวลาเหลือ 0 */
export type TimerStatus = "idle" | "running" | "paused" | "ended";
export type TimerData = {
  status: TimerStatus;
  /** วินาทีคงเหลือ ณ ตอนที่ server ตอบ */
  remainingSec: number;
  /** เวลาจบตอนกำลังนับ — ใช้คำนวณเวลาที่เพิ่มแบบแม่นยำ (ไม่พึ่งนาฬิกาเครื่อง) */
  endsAt: string | null;
  label: string;
  style: TimerStyle;
};

export const TIMER_ACTIONS = [
  "start",
  "pause",
  "resume",
  "reset",
  "adjust",
] as const;
export type TimerAction = (typeof TIMER_ACTIONS)[number];
export const timerControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["start", "pause", "resume", "reset"]) }),
  z.object({
    action: z.literal("adjust"),
    seconds: z.number().int().min(-86400).max(86400),
  }),
]);

/** วินาทีที่เพิ่มจากโดเนท — ตามสัดส่วน "ทุก X บาท เพิ่ม Y วินาที" */
export function subathonSecondsFor(
  amountSatang: number,
  stepSatang: number,
  stepSeconds: number,
): number {
  if (stepSatang <= 0 || amountSatang <= 0) return 0;
  return Math.round((amountSatang * stepSeconds) / stepSatang);
}

/** วินาทีที่โดเนทนี้เปลี่ยน (ลบ = ลดเวลา) */
export function subathonDeltaFor(
  amountSatang: number,
  direction: TimerDirection,
  stepSatang: number,
  stepSeconds: number,
): number {
  const sec = subathonSecondsFor(amountSatang, stepSatang, stepSeconds);
  return direction === "subtract" ? -sec : sec;
}

/** "1 ชม. 5 นาที 30 วินาที" — ข้อความใบ้ให้อ่านง่ายกว่า HH:MM:SS */
export function formatDurationWords(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  if (sec === 0) return "0 วินาที";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h && `${h} ชม.`, m && `${m} นาที`, s && `${s} วินาที`]
    .filter(Boolean)
    .join(" ");
}

/** สถานะ + เวลาคงเหลือจากแถวใน DB ณ เวลา now */
export function timerState(
  row: {
    status: "idle" | "running" | "paused";
    endsAt: string | null;
    remainingSec: number;
    initialSec: number;
  },
  now: Date = new Date(),
): { status: TimerStatus; remainingSec: number; endsAt: string | null } {
  if (row.status === "idle") {
    return { status: "idle", remainingSec: row.initialSec, endsAt: null };
  }
  if (row.status === "paused") {
    return row.remainingSec > 0
      ? { status: "paused", remainingSec: row.remainingSec, endsAt: null }
      : { status: "ended", remainingSec: 0, endsAt: null };
  }
  const left = Math.max(
    0,
    Math.ceil((Date.parse(row.endsAt ?? "") - now.getTime()) / 1000),
  );
  return left > 0
    ? { status: "running", remainingSec: left, endsAt: row.endsAt }
    : { status: "ended", remainingSec: 0, endsAt: null };
}

/**
 * เวลาที่เปลี่ยน (วินาที) ระหว่างข้อมูลเก่า → ใหม่ ในรอบเดียวกัน
 * กำลังนับ: เทียบเวลาจบ (แม่นยำ) · พัก: เทียบเวลาคงเหลือ · อื่นๆ (เริ่ม/พัก/นับต่อ/รีเซ็ต) = 0
 */
export function timerDelta(
  prev: Pick<TimerData, "status" | "remainingSec" | "endsAt">,
  next: Pick<TimerData, "status" | "remainingSec" | "endsAt">,
): number {
  if (prev.status === "running" && next.status === "running") {
    return Math.round(
      (Date.parse(next.endsAt ?? "") - Date.parse(prev.endsAt ?? "")) / 1000,
    );
  }
  if (prev.status === "paused" && next.status === "paused") {
    return next.remainingSec - prev.remainingSec;
  }
  return 0;
}

/** "01:00:00" — ชั่วโมงเกิน 24 ได้ */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** "+2:30", "+1:00:00", "−5:00" สำหรับเด้งตอนเวลาเปลี่ยน */
export function formatDelta(deltaSec: number): string {
  const sign = deltaSec < 0 ? "−" : "+";
  const sec = Math.abs(Math.round(deltaSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h > 0
    ? `${sign}${h}:${String(m).padStart(2, "0")}:${s}`
    : `${sign}${m}:${s}`;
}

export type AvatarData = {
  idleUrl: string | null;
  speakUrl: string | null;
  style: AvatarStyle;
};

/** ระดับเสียง 0–100 ถึงเกณฑ์ไหม */
export function isSpeakingLevel(level: number, threshold: number): boolean {
  return level >= threshold;
}

/** RMS ของสัญญาณ (−1..1) → ระดับ 0–100 แบบ log ให้เสียงพูดปกติอยู่กลางแถบ */
export function rmsToLevel(rms: number): number {
  if (rms <= 0) return 0;
  const db = 20 * Math.log10(rms); // เงียบ ~ −60dB, พูด ~ −25..−10dB
  return Math.max(0, Math.min(100, Math.round(((db + 60) / 60) * 100)));
}

export type WidgetData = {
  goal: GoalData;
  qr: QrData;
  top: TopData;
  recent: RecentData;
  timer: TimerData;
  avatar: AvatarData;
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

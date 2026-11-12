"use client";

import {
  ListOrdered,
  Loader2,
  QrCode,
  RotateCcw,
  Target,
  TextCursorInput,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ColorField } from "@/components/dashboard/color-field";
import { ObsUrlField } from "@/components/dashboard/obs-url-field";
import { SectionCard } from "@/components/dashboard/section-card";
import { SettingRow } from "@/components/dashboard/setting-row";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/dashboard/segmented-control";
import {
  GoalWidget,
  QrWidget,
  RecentWidget,
  TimerWidget,
  TopWidget,
  WidgetStage,
} from "@/components/overlay-widgets/widgets";
import { ScaledPreview } from "@/components/overlay-widgets/scaled-preview";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  GOAL_TARGET_SATANG,
  RECENT_COUNT,
  SAMPLE_DONORS,
  TOP_COUNT,
  TOP_PERIOD_LABELS,
  TOP_PERIODS,
  DEFAULT_STYLES,
  GOAL_WIDTH,
  SIZE_LABELS,
  SIZE_STEPS,
  SPEED_LABELS,
  SPEEDS,
  rankDonors,
  widgetSize,
  type WidgetStyles,
  type OverlayWidgetInput,
  type OverlayWidgetSettings,
  type WidgetData,
  type WidgetKind,
} from "@/lib/overlay-widgets";

import { cn } from "@/lib/utils";
import { TextField } from "@/components/dashboard/form-fields";

import { UnsavedBar } from "../unsaved-bar";

const pick = (s: OverlayWidgetSettings): OverlayWidgetInput => ({
  goalTitle: s.goalTitle,
  goalTargetSatang: s.goalTargetSatang,
  qrCaption: s.qrCaption,
  topPeriod: s.topPeriod,
  topCount: s.topCount,
  recentCount: s.recentCount,
  timerInitialSec: s.timerInitialSec,
  timerStepSatang: s.timerStepSatang,
  timerStepSeconds: s.timerStepSeconds,
  timerLabel: s.timerLabel,
  timerMode: s.timerMode,
  timerAllowSubtract: s.timerAllowSubtract,
  styles: s.styles,
});

const sliderValue = (v: number | readonly number[]) =>
  typeof v === "number" ? v : v[0];

const sampleTop = rankDonors(
  SAMPLE_DONORS.map((d) => ({
    donorName: d.name,
    amountSatang: d.amountSatang,
  })),
  10,
);
const sampleRecent = SAMPLE_DONORS.map((d, i) => ({ id: `s${i}`, ...d }));

/** ช่องเลือกสีเรียงตามความกว้างที่มี (คอลัมน์ "หน้าตา" แคบบนคอม) */
const COLOR_GRID = "grid gap-4 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]";

const TABS: SegmentOption<WidgetKind>[] = [
  { value: "goal", label: "Goal", icon: Target },
  { value: "qr", label: "QR", icon: QrCode },
  { value: "top", label: "อันดับ", icon: ListOrdered },
  { value: "recent", label: "ล่าสุด", icon: TextCursorInput },
  { value: "timer", label: "Subathon", icon: Timer },
];

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? fallback;
}

export function OverlaysForm({
  initial,
  baseUrl,
  data,
}: {
  initial: OverlayWidgetSettings;
  baseUrl: string;
  data: WidgetData;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(pick(initial));
  const [draft, setDraft] = useState(pick(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [active, setActive] = useState<WidgetKind>("goal");
  const timer = data.timer;

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof OverlayWidgetInput>(
    key: K,
    value: OverlayWidgetInput[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };
  /** แก้หน้าตา widget ทีละช่อง */
  const setStyle = <K extends WidgetKind, F extends keyof WidgetStyles[K]>(
    kind: K,
    field: F,
    value: WidgetStyles[K][F],
  ) => {
    setDraft((d) => ({
      ...d,
      styles: { ...d.styles, [kind]: { ...d.styles[kind], [field]: value } },
    }));
    setError(null);
  };
  const resetStyle = (kind: WidgetKind) => {
    setDraft((d) => ({
      ...d,
      styles: { ...d.styles, [kind]: DEFAULT_STYLES[kind] },
    }));
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/overlays", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        setError(await readError(res, "บันทึกไม่สำเร็จ"));
        return;
      }
      const next = pick(await res.json());
      setSaved(next);
      setDraft(next);
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function resetGoal() {
    setResetting(true);
    try {
      const res = await fetch("/api/settings/overlays/goal/reset", {
        method: "POST",
      });
      if (!res.ok) {
        setError(await readError(res, "เริ่มนับใหม่ไม่สำเร็จ"));
        return;
      }
      setResetOpen(false);
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  const st = draft.styles;
  // พรีวิว: ใช้ค่าที่กำลังแก้ + ข้อมูลจริง (ไม่มีโดเนทใช้ตัวอย่าง)
  const topItems = (data.top.items.length ? data.top.items : sampleTop).slice(
    0,
    draft.topCount,
  );
  const recentItems = (
    data.recent.items.length ? data.recent.items : sampleRecent
  ).slice(0, draft.recentCount);

  // พรีวิว timer นับถอยหลังจริง — memo ไว้ ไม่งั้นทุก render นับว่า "ข้อมูลใหม่"
  const timerPreview = useMemo(
    () => ({
      ...timer,
      remainingSec:
        timer.status === "idle" ? draft.timerInitialSec : timer.remainingSec,
      label: draft.timerLabel.trim() || "Subathon",
      style: st.timer,
    }),
    [timer, draft.timerInitialSec, draft.timerLabel, st.timer],
  );

  const card = {
    goal: {
      icon: Target,
      title: "Donate Goal",
      description: "หลอดเป้าหมาย นับยอดโดเนทที่ผ่านแล้วตั้งแต่เริ่มนับ",
      preview: (
        <GoalWidget
          data={{
            title: draft.goalTitle.trim() || "เป้าหมายโดเนท",
            targetSatang: draft.goalTargetSatang,
            currentSatang: data.goal.currentSatang,
            style: st.goal,
          }}
        />
      ),
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="goalTitle"
              label="ชื่อเป้าหมาย"
              placeholder="ซื้อไมค์ใหม่"
              value={draft.goalTitle}
              onChange={(v) => set("goalTitle", v)}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="goalTarget">ยอดเป้าหมาย (บาท)</Label>
              <Input
                id="goalTarget"
                inputMode="numeric"
                className="font-mono"
                value={String(draft.goalTargetSatang / 100)}
                onChange={(e) => {
                  const baht = Number(e.target.value.replace(/\D/g, "") || 0);
                  set(
                    "goalTargetSatang",
                    Math.min(GOAL_TARGET_SATANG.max, baht * 100),
                  );
                }}
                onBlur={() => {
                  if (draft.goalTargetSatang < GOAL_TARGET_SATANG.min)
                    set("goalTargetSatang", GOAL_TARGET_SATANG.min);
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              เริ่มนับเมื่อ{" "}
              {new Intl.DateTimeFormat("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Bangkok",
              }).format(new Date(initial.goalStartedAt))}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw />
              เริ่มนับใหม่
            </Button>
          </div>
        </>
      ),
      appearance: (
        <>
          <RangeField
            label="ความกว้างหลอด"
            unit="px"
            value={st.goal.width}
            range={GOAL_WIDTH}
            step={20}
            onChange={(v) => setStyle("goal", "width", v)}
          />
          <SizeField
            label="ความหนาหลอด"
            value={st.goal.barHeight}
            onChange={(v) => setStyle("goal", "barHeight", v)}
          />
          <div className={COLOR_GRID}>
            <ColorField
              id="goalBarFrom"
              label="สีหลอด (ซ้าย)"
              value={st.goal.barFrom}
              onChange={(v) => setStyle("goal", "barFrom", v)}
            />
            <ColorField
              id="goalBarTo"
              label="สีหลอด (ขวา)"
              value={st.goal.barTo}
              onChange={(v) => setStyle("goal", "barTo", v)}
            />
            <ColorField
              id="goalTrack"
              label="สีพื้นหลอด"
              value={st.goal.trackColor}
              onChange={(v) => setStyle("goal", "trackColor", v)}
            />
          </div>
          <CommonStyle kind="goal" styles={st} setStyle={setStyle} />
          <div className="divide-y">
            <SettingRow
              id="goalShowAmount"
              label="แสดงยอด"
              hint="เช่น 700 / 1,000 บาท"
              checked={st.goal.showAmount}
              onChange={(v) => setStyle("goal", "showAmount", v)}
            />
            <SettingRow
              id="goalShowPercent"
              label="แสดงเปอร์เซ็นต์"
              checked={st.goal.showPercent}
              onChange={(v) => setStyle("goal", "showPercent", v)}
            />
          </div>
        </>
      ),
    },
    qr: {
      icon: QrCode,
      title: "QR โดเนทบนจอ",
      description: "ผู้ชมสแกนจากจอไลฟ์แล้วไปหน้าโดเนทของคุณ",
      preview: (
        <QrWidget
          data={{
            caption: draft.qrCaption.trim() || "สแกนเพื่อโดเนท",
            donateUrl: data.qr.donateUrl,
            style: st.qr,
          }}
        />
      ),
      content: (
        <TextField
          id="qrCaption"
          label="ข้อความบนการ์ด"
          placeholder="สแกนเพื่อโดเนท"
          value={draft.qrCaption}
          onChange={(v) => set("qrCaption", v)}
        />
      ),
      appearance: (
        <>
          <SizeField
            label="ขนาด QR"
            value={st.qr.size}
            onChange={(v) => setStyle("qr", "size", v)}
          />
          <div className={COLOR_GRID}>
            <ColorField
              id="qrBorder"
              label="สีกรอบ"
              value={st.qr.borderColor}
              onChange={(v) => setStyle("qr", "borderColor", v)}
            />
            <ColorField
              id="qrText"
              label="สีข้อความ"
              value={st.qr.textColor}
              onChange={(v) => setStyle("qr", "textColor", v)}
            />
          </div>
          <SizeField
            label="ขนาดตัวอักษร"
            value={st.qr.textSize}
            onChange={(v) => setStyle("qr", "textSize", v)}
          />
        </>
      ),
    },
    top: {
      icon: ListOrdered,
      title: "อันดับผู้สนับสนุน",
      description: "รวมยอดตามชื่อที่ผู้บริจาคกรอก ไม่รวม Anonymous",
      preview: (
        <TopWidget
          data={{ period: draft.topPeriod, items: topItems, style: st.top }}
        />
      ),
      content: (
        <div className="grid gap-4">
          <TextField
            id="topTitle"
            label="หัวข้อ"
            placeholder="Top ผู้สนับสนุน"
            value={st.top.title}
            onChange={(v) => setStyle("top", "title", v)}
          />
          <div className="grid gap-2">
            <span className="text-sm font-medium">ช่วงเวลา</span>
            <SegmentedControl
              label="ช่วงเวลาอันดับ"
              options={TOP_PERIODS.map((p) => ({
                value: p,
                label: TOP_PERIOD_LABELS[p],
              }))}
              value={draft.topPeriod}
              onChange={(v) => set("topPeriod", v)}
            />
          </div>
          <RangeField
            label="จำนวนอันดับ"
            value={draft.topCount}
            range={TOP_COUNT}
            onChange={(v) => set("topCount", v)}
          />
        </div>
      ),
      appearance: (
        <>
          <div className={COLOR_GRID}>
            <ColorField
              id="topName"
              label="สีชื่อ"
              value={st.top.nameColor}
              onChange={(v) => setStyle("top", "nameColor", v)}
            />
            <ColorField
              id="topTitleColor"
              label="สีหัวข้อ"
              value={st.top.textColor}
              onChange={(v) => setStyle("top", "textColor", v)}
            />
          </div>
          <CommonStyle kind="top" styles={st} setStyle={setStyle} noText />
        </>
      ),
    },
    recent: {
      icon: TextCursorInput,
      title: "แถบโดเนทล่าสุด",
      description: "ตัวหนังสือวิ่ง ชื่อ + ยอด ของโดเนทที่ผ่านล่าสุด",
      preview: <RecentWidget data={{ items: recentItems, style: st.recent }} />,
      content: (
        <RangeField
          label="จำนวนรายการ"
          value={draft.recentCount}
          range={RECENT_COUNT}
          onChange={(v) => set("recentCount", v)}
        />
      ),
      appearance: (
        <>
          <div className="grid gap-2">
            <span className="text-sm font-medium">ความเร็ว</span>
            <SegmentedControl
              label="ความเร็วแถบวิ่ง"
              options={SPEEDS.map((v) => ({
                value: v,
                label: SPEED_LABELS[v],
              }))}
              value={st.recent.speed}
              onChange={(v) => setStyle("recent", "speed", v)}
            />
          </div>
          <div className={COLOR_GRID}>
            <ColorField
              id="recentName"
              label="สีชื่อ"
              value={st.recent.textColor}
              onChange={(v) => setStyle("recent", "textColor", v)}
            />
            <ColorField
              id="recentBg"
              label="สีพื้นแถบ"
              value={st.recent.backgroundColor}
              onChange={(v) => setStyle("recent", "backgroundColor", v)}
            />
          </div>
          <CommonStyle kind="recent" styles={st} setStyle={setStyle} noText />
          <SettingRow
            id="recentShowBg"
            label="แสดงพื้นหลังแถบ"
            hint="ปิดแล้วเหลือแค่ตัวหนังสือขอบดำ"
            checked={st.recent.showBackground}
            onChange={(v) => setStyle("recent", "showBackground", v)}
          />
        </>
      ),
    },
    timer: {
      icon: Timer,
      title: "Subathon timer",
      description: "นับถอยหลังบนจอไลฟ์ โดเนทแล้วเวลาเพิ่ม/ลด",
      preview: <TimerWidget data={timerPreview} />,
      content: (
        <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="text-muted-foreground">
            เริ่ม/พักเวลา, ดูโดเนทที่บวก/ลด และตั้งกฎเวลา อยู่ที่เมนู Subathon
          </p>
          <Link
            href="/dashboard/subathon"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Timer />
            ไปที่เมนู Subathon
          </Link>
        </div>
      ),
      appearance: (
        <>
          <div className={COLOR_GRID}>
            <ColorField
              id="timerTime"
              label="สีเวลา"
              value={st.timer.textColor}
              onChange={(v) => setStyle("timer", "textColor", v)}
            />
            <ColorField
              id="timerLabelColor"
              label="สีป้าย"
              value={st.timer.labelColor}
              onChange={(v) => setStyle("timer", "labelColor", v)}
            />
            <ColorField
              id="timerDelta"
              label="สี +เวลา"
              value={st.timer.amountColor}
              onChange={(v) => setStyle("timer", "amountColor", v)}
            />
            <ColorField
              id="timerBg"
              label="สีพื้นหลัง"
              value={st.timer.backgroundColor}
              onChange={(v) => setStyle("timer", "backgroundColor", v)}
            />
          </div>
          <SizeField
            label="ขนาดตัวอักษร"
            value={st.timer.textSize}
            onChange={(v) => setStyle("timer", "textSize", v)}
          />
          <SettingRow
            id="timerShowBg"
            label="แสดงพื้นหลัง"
            checked={st.timer.showBackground}
            onChange={(v) => setStyle("timer", "showBackground", v)}
          />
        </>
      ),
    },
  } satisfies Record<
    WidgetKind,
    Omit<CardProps, "kind" | "url" | "size" | "onResetStyle">
  >;

  return (
    <div className="mt-6 grid gap-4 pb-24">
      <SegmentedControl
        role="tab"
        label="เลือก overlay"
        fullWidth
        options={TABS}
        value={active}
        onChange={setActive}
      />

      <WidgetCard
        key={active}
        kind={active}
        url={`${baseUrl}/${active}`}
        size={widgetSize(active, st)}
        onResetStyle={() => resetStyle(active)}
        {...card[active]}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เริ่มนับเป้าหมายใหม่?</DialogTitle>
            <DialogDescription>
              หลอดบนจอจะกลับเป็น 0 แล้วนับเฉพาะโดเนทหลังจากนี้ (ประวัติโดเนทไม่หาย)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={resetGoal} disabled={resetting}>
              {resetting && <Loader2 className="animate-spin" />}
              เริ่มนับใหม่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dirty && (
        <UnsavedBar
          saving={saving}
          onCancel={() => {
            setDraft(saved);
            setError(null);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

type SetStyle = <K extends WidgetKind, F extends keyof WidgetStyles[K]>(
  kind: K,
  field: F,
  value: WidgetStyles[K][F],
) => void;

/** สียอดเงิน + สีตัวอักษร + ขนาดตัวอักษร (มีทุก widget) */
function CommonStyle({
  kind,
  styles,
  setStyle,
  noText = false,
}: {
  kind: WidgetKind;
  styles: WidgetStyles;
  setStyle: SetStyle;
  /** สีตัวอักษรตั้งที่อื่นแล้ว (เช่น "สีชื่อ") */
  noText?: boolean;
}) {
  const s = styles[kind];
  return (
    <>
      <div className={COLOR_GRID}>
        <ColorField
          id={`${kind}Amount`}
          label="สียอดเงิน"
          value={s.amountColor}
          onChange={(v) => setStyle(kind, "amountColor", v)}
        />
        {!noText && (
          <ColorField
            id={`${kind}Text`}
            label="สีตัวอักษร"
            value={s.textColor}
            onChange={(v) => setStyle(kind, "textColor", v)}
          />
        )}
      </div>
      <SizeField
        label="ขนาดตัวอักษร"
        value={s.textSize}
        onChange={(v) => setStyle(kind, "textSize", v)}
      />
    </>
  );
}

type CardProps = {
  kind: WidgetKind;
  icon: React.ComponentProps<typeof SectionCard>["icon"];
  title: string;
  description: string;
  url: string;
  size: { width: number; height: number };
  preview: React.ReactNode;
  content: React.ReactNode;
  appearance: React.ReactNode;
  onResetStyle: () => void;
};

function WidgetCard({
  kind,
  icon,
  title,
  description,
  url,
  size,
  preview,
  content,
  appearance,
  onResetStyle,
}: CardProps) {
  return (
    <SectionCard
      id={`widget-${kind}`}
      icon={icon}
      title={title}
      description={description}
      bodyClassName="px-0 pb-0"
    >
      <div className="grid gap-6 px-6 pb-6">
        <div className="grid gap-2">
          <p className="flex items-center justify-between text-xs text-muted-foreground">
            <span>พรีวิวตามขนาดจริงใน OBS</span>
            <span className="font-mono">
              {size.width}×{size.height}
            </span>
          </p>
          <ScaledPreview
            testId={`widget-preview-${kind}`}
            width={size.width}
            height={size.height}
          >
            <WidgetStage kind={kind} className="size-full">
              {preview}
            </WidgetStage>
          </ScaledPreview>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby={`${kind}-content`} className="min-w-0">
            <h3
              id={`${kind}-content`}
              className="mb-3 text-sm font-semibold text-muted-foreground"
            >
              เนื้อหา
            </h3>
            {content}
          </section>
          <section
            aria-labelledby={`${kind}-look`}
            className="grid min-w-0 content-start gap-4 lg:border-l lg:pl-6"
          >
            <div className="flex items-center justify-between">
              <h3
                id={`${kind}-look`}
                className="text-sm font-semibold text-muted-foreground"
              >
                หน้าตา
              </h3>
              <Button variant="ghost" size="sm" onClick={onResetStyle}>
                <RotateCcw />
                คืนค่าเริ่มต้น
              </Button>
            </div>
            {appearance}
          </section>
        </div>
      </div>
      <div className="grid gap-2 rounded-b-2xl border-t bg-muted/40 px-6 py-4">
        <span className="text-sm font-medium">ลิงก์ OBS</span>
        <ObsUrlField
          url={url}
          size={size}
          testId={`widget-url-${kind}`}
          copyLabel={`คัดลอกลิงก์ ${title}`}
        />
      </div>
    </SectionCard>
  );
}

function SizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: (typeof SIZE_STEPS)[number];
  onChange: (v: (typeof SIZE_STEPS)[number]) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <SegmentedControl
        label={label}
        options={SIZE_STEPS.map((v) => ({ value: v, label: SIZE_LABELS[v] }))}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function RangeField({
  label,
  value,
  range,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  range: { min: number; max: number };
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm">
          {value}
          {unit && ` ${unit}`}
        </span>
      </div>
      <Slider
        thumbLabel={label}
        min={range.min}
        max={range.max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(sliderValue(v))}
      />
    </div>
  );
}

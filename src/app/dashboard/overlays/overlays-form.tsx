"use client";

import {
  ListOrdered,
  Loader2,
  QrCode,
  RotateCcw,
  Target,
  TextCursorInput,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ObsUrlField } from "@/components/dashboard/obs-url-field";
import { SectionCard } from "@/components/dashboard/section-card";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/dashboard/segmented-control";
import {
  GoalWidget,
  QrWidget,
  RecentWidget,
  TopWidget,
  WidgetStage,
} from "@/components/overlay-widgets/widgets";
import { ScaledPreview } from "@/components/overlay-widgets/scaled-preview";
import { Button } from "@/components/ui/button";
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
  WIDGET_SIZES,
  WIDGET_TEXT_MAX,
  rankDonors,
  type OverlayWidgetInput,
  type OverlayWidgetSettings,
  type WidgetData,
  type WidgetKind,
} from "@/lib/overlay-widgets";

import { UnsavedBar } from "../unsaved-bar";

const pick = (s: OverlayWidgetSettings): OverlayWidgetInput => ({
  goalTitle: s.goalTitle,
  goalTargetSatang: s.goalTargetSatang,
  qrCaption: s.qrCaption,
  topPeriod: s.topPeriod,
  topCount: s.topCount,
  recentCount: s.recentCount,
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

const TABS: SegmentOption<WidgetKind>[] = [
  { value: "goal", label: "Goal", icon: Target },
  { value: "qr", label: "QR", icon: QrCode },
  { value: "top", label: "อันดับ", icon: ListOrdered },
  { value: "recent", label: "ล่าสุด", icon: TextCursorInput },
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

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof OverlayWidgetInput>(
    key: K,
    value: OverlayWidgetInput[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
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

  // พรีวิว: ใช้ค่าที่กำลังแก้ + ข้อมูลจริง (ไม่มีโดเนทใช้ตัวอย่าง)
  const topItems = (data.top.items.length ? data.top.items : sampleTop).slice(
    0,
    draft.topCount,
  );
  const recentItems = (
    data.recent.items.length ? data.recent.items : sampleRecent
  ).slice(0, draft.recentCount);

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

      {active === "goal" && (
        <WidgetCard
          kind="goal"
          icon={Target}
          title="Donate Goal"
          description="หลอดเป้าหมาย นับยอดโดเนทที่ผ่านแล้วตั้งแต่เริ่มนับ"
          url={`${baseUrl}/goal`}
          preview={
            <GoalWidget
              data={{
                title: draft.goalTitle.trim() || "เป้าหมายโดเนท",
                targetSatang: draft.goalTargetSatang,
                currentSatang: data.goal.currentSatang,
              }}
            />
          }
        >
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
        </WidgetCard>
      )}

      {active === "qr" && (
        <WidgetCard
          kind="qr"
          icon={QrCode}
          title="QR โดเนทบนจอ"
          description="ผู้ชมสแกนจากจอไลฟ์แล้วไปหน้าโดเนทของคุณ"
          url={`${baseUrl}/qr`}
          preview={
            <QrWidget
              data={{
                caption: draft.qrCaption.trim() || "สแกนเพื่อโดเนท",
                donateUrl: data.qr.donateUrl,
              }}
            />
          }
        >
          <TextField
            id="qrCaption"
            label="ข้อความบนการ์ด"
            placeholder="สแกนเพื่อโดเนท"
            value={draft.qrCaption}
            onChange={(v) => set("qrCaption", v)}
          />
        </WidgetCard>
      )}

      {active === "top" && (
        <WidgetCard
          kind="top"
          icon={ListOrdered}
          title="อันดับผู้สนับสนุน"
          description="รวมยอดตามชื่อที่ผู้บริจาคกรอก ไม่รวม Anonymous"
          url={`${baseUrl}/top`}
          preview={
            <TopWidget data={{ period: draft.topPeriod, items: topItems }} />
          }
        >
          <div className="grid gap-4">
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
            <CountSlider
              label="จำนวนอันดับ"
              value={draft.topCount}
              range={TOP_COUNT}
              onChange={(v) => set("topCount", v)}
            />
          </div>
        </WidgetCard>
      )}

      {active === "recent" && (
        <WidgetCard
          kind="recent"
          icon={TextCursorInput}
          title="แถบโดเนทล่าสุด"
          description="ตัวหนังสือวิ่ง ชื่อ + ยอด ของโดเนทที่ผ่านล่าสุด"
          url={`${baseUrl}/recent`}
          preview={<RecentWidget data={{ items: recentItems }} />}
        >
          <CountSlider
            label="จำนวนรายการ"
            value={draft.recentCount}
            range={RECENT_COUNT}
            onChange={(v) => set("recentCount", v)}
          />
        </WidgetCard>
      )}

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

function WidgetCard({
  kind,
  icon,
  title,
  description,
  url,
  preview,
  children,
}: {
  kind: WidgetKind;
  icon: React.ComponentProps<typeof SectionCard>["icon"];
  title: string;
  description: string;
  url: string;
  preview: React.ReactNode;
  children: React.ReactNode;
}) {
  const size = WIDGET_SIZES[kind];
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
        <div className="min-w-0">{children}</div>
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

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">
          {value.length}/{WIDGET_TEXT_MAX}
        </span>
      </div>
      <Input
        id={id}
        placeholder={placeholder}
        maxLength={WIDGET_TEXT_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CountSlider({
  label,
  value,
  range,
  onChange,
}: {
  label: string;
  value: number;
  range: { min: number; max: number };
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm">{value}</span>
      </div>
      <Slider
        thumbLabel={label}
        min={range.min}
        max={range.max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(sliderValue(v))}
      />
    </div>
  );
}

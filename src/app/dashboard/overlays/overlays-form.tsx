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

import { CopyButton } from "@/components/dashboard/copy-button";
import { SectionCard } from "@/components/dashboard/section-card";
import { SegmentedControl } from "@/components/dashboard/segmented-control";
import {
  GoalWidget,
  QrWidget,
  RecentWidget,
  TopWidget,
} from "@/components/overlay-widgets/widgets";
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

/** พื้นลายตารางแทนพื้นโปร่งใสของ OBS */
const checkerboard: React.CSSProperties = {
  backgroundColor: "#e5e5e5",
  backgroundImage:
    "conic-gradient(#d4d4d4 25%, transparent 0 50%, #d4d4d4 0 75%, transparent 0)",
  backgroundSize: "24px 24px",
};

const sampleTop = rankDonors(
  SAMPLE_DONORS.map((d) => ({
    donorName: d.name,
    amountSatang: d.amountSatang,
  })),
  10,
);
const sampleRecent = SAMPLE_DONORS.map((d, i) => ({ id: `s${i}`, ...d }));

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

/** ซ่อน token ส่วนใหญ่ — ลิงก์นี้ห้ามขึ้นจอไลฟ์ */
function maskUrl(url: string) {
  return url.replace(
    /\/overlay\/([^/]{4})[^/]+/,
    (_, head) => `/overlay/${head}${"•".repeat(10)}`,
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
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {children}
          <div className="mt-5 grid gap-1.5">
            <span className="text-sm font-medium">ลิงก์ OBS</span>
            <div className="flex gap-2">
              <p
                data-testid={`widget-url-${kind}`}
                className="min-w-0 flex-1 truncate rounded-lg border bg-background px-3 py-2 font-mono text-sm"
              >
                {maskUrl(url)}
              </p>
              <CopyButton text={url} ariaLabel={`คัดลอกลิงก์ ${title}`} />
            </div>
            <p className="text-xs text-muted-foreground">
              Browser Source กว้าง {size.width} สูง {size.height}
            </p>
          </div>
        </div>
        <div
          data-testid={`widget-preview-${kind}`}
          className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border p-4"
          style={checkerboard}
        >
          {preview}
        </div>
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

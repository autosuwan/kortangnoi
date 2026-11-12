"use client";

import { useState } from "react";

import { DurationField, NumberInput } from "@/components/dashboard/form-fields";
import { SegmentedControl } from "@/components/dashboard/segmented-control";
import { SettingRow } from "@/components/dashboard/setting-row";
import {
  formatDurationWords,
  subathonSecondsFor,
  TIMER_STEP_SECONDS,
  type OverlayWidgetSettings,
  type TimerMode,
} from "@/lib/overlay-widgets";

import { UnsavedBar } from "../unsaved-bar";

type TimerFields = Pick<
  OverlayWidgetSettings,
  | "timerInitialSec"
  | "timerStepSatang"
  | "timerStepSeconds"
  | "timerMode"
  | "timerAllowSubtract"
>;

const pick = (s: OverlayWidgetSettings): TimerFields => ({
  timerInitialSec: s.timerInitialSec,
  timerStepSatang: s.timerStepSatang,
  timerStepSeconds: s.timerStepSeconds,
  timerMode: s.timerMode,
  timerAllowSubtract: s.timerAllowSubtract,
});

/** ตั้งค่า subathon — บันทึกเฉพาะช่อง timer ทับค่าล่าสุดของ widget อื่น */
export function SubathonSettings({
  initial,
  onSaved,
}: {
  initial: OverlayWidgetSettings;
  onSaved: () => void;
}) {
  const [saved, setSaved] = useState(pick(initial));
  const [draft, setDraft] = useState(pick(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof TimerFields>(key: K, value: TimerFields[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // ดึงค่าล่าสุดก่อน กันทับหน้าตาที่เพิ่งแก้ในหน้า Overlay
      const current = await fetch("/api/settings/overlays", {
        cache: "no-store",
      });
      if (!current.ok) throw new Error();
      const latest: Partial<OverlayWidgetSettings> = await current.json();
      delete latest.goalStartedAt;
      const res = await fetch("/api/settings/overlays", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...latest, ...draft }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "บันทึกไม่สำเร็จ");
        return;
      }
      const next = pick(body);
      setSaved(next);
      setDraft(next);
      onSaved();
    } catch {
      setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const stepBaht = draft.timerStepSatang / 100;
  const perHundred = subathonSecondsFor(
    10000,
    draft.timerStepSatang,
    draft.timerStepSeconds,
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">กฎเวลา</span>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          ทุก
          <NumberInput
            ariaLabel="ทุกกี่บาท"
            value={stepBaht}
            min={1}
            max={100000}
            onChange={(v) => set("timerStepSatang", v * 100)}
          />
          บาท =
          <NumberInput
            ariaLabel="กี่วินาที"
            value={draft.timerStepSeconds}
            min={TIMER_STEP_SECONDS.min}
            max={TIMER_STEP_SECONDS.max}
            onChange={(v) => set("timerStepSeconds", v)}
          />
          วินาที
          <span className="text-muted-foreground">
            ({formatDurationWords(draft.timerStepSeconds)})
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          คิดตามสัดส่วน เช่น โดเนท {stepBaht.toLocaleString("en-US")} บาท ={" "}
          {formatDurationWords(draft.timerStepSeconds)} · 100 บาท ={" "}
          {formatDurationWords(perHundred)}
        </p>
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium">ปรับเวลาจากโดเนท</span>
        <SegmentedControl<TimerMode>
          label="ปรับเวลาจากโดเนท"
          options={[
            { value: "auto", label: "อัตโนมัติ" },
            { value: "manual", label: "กดเอง" },
          ]}
          value={draft.timerMode}
          onChange={(v) => set("timerMode", v)}
        />
        <p className="text-xs text-muted-foreground">
          {draft.timerMode === "auto"
            ? "โดเนทผ่านแล้วเวลาเปลี่ยนทันที"
            : 'โดเนทผ่านแล้วขึ้นในรายการ "โดเนทรอบนี้" — กด "ใช้" ทีละรายการหรือ "ใช้ทั้งหมด"'}
        </p>
      </div>

      <SettingRow
        id="timerAllowSubtract"
        label="ให้คนดูเลือกลดเวลาได้"
        hint="หน้าโดเนทมีปุ่ม + เพิ่มเวลา / − ลดเวลา (แสดงเฉพาะตอนกำลังนับหรือพัก)"
        checked={draft.timerAllowSubtract}
        onChange={(v) => set("timerAllowSubtract", v)}
      />

      <DurationField
        label="เวลาเริ่มต้น"
        hint="ใช้ตอนกดเริ่มครั้งแรก/หลังรีเซ็ต"
        value={draft.timerInitialSec}
        onChange={(v) => set("timerInitialSec", v)}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {dirty && (
        <UnsavedBar
          saving={saving}
          onCancel={() => setDraft(saved)}
          onSave={save}
        />
      )}
    </div>
  );
}

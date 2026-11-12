"use client";

import { Check, ListChecks, Loader2, Settings2, Timer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ObsUrlField } from "@/components/dashboard/obs-url-field";
import { SectionCard } from "@/components/dashboard/section-card";
import { SegmentedControl } from "@/components/dashboard/segmented-control";
import { Button } from "@/components/ui/button";
import { formatBangkokDateTime } from "@/lib/bangkok-time";
import { DONATIONS_CHANGED_EVENT } from "@/lib/dashboard-events";
import { formatSatangNumber } from "@/lib/money";
import {
  formatDelta,
  widgetSize,
  type OverlayWidgetSettings,
  type TimerData,
} from "@/lib/overlay-widgets";
import type { listRoundDonations } from "@/server/services/streamer-donations";

import { TimerChip } from "../donations/timer-chip";
import { SubathonSettings } from "./subathon-settings";
import { TimerControls } from "./timer-controls";

type Round = Awaited<ReturnType<typeof listRoundDonations>>;
type Filter = "pending" | "all";

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? fallback;
}

export function SubathonView({
  initialSettings,
  initialTimer,
  initialRound,
  obsUrl,
}: {
  initialSettings: OverlayWidgetSettings;
  initialTimer: TimerData;
  initialRound: Round;
  obsUrl: string;
}) {
  const [timer, setTimer] = useState(initialTimer);
  const [round, setRound] = useState(initialRound);
  const [filter, setFilter] = useState<Filter>(
    initialRound.mode === "manual" && initialRound.pendingCount > 0
      ? "pending"
      : "all",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/settings/overlays/timer/donations?filter=all`,
      { cache: "no-store" },
    ).catch(() => null);
    if (!res?.ok) return;
    const next: Round = await res.json();
    setRound(next);
    setTimer(next.timer);
  }, []);

  // โดเนทใหม่/เปลี่ยนสถานะ (DonationWatcher ใน layout) → โหลดรายการใหม่
  useEffect(() => {
    window.addEventListener(DONATIONS_CHANGED_EVENT, load);
    return () => window.removeEventListener(DONATIONS_CHANGED_EVENT, load);
  }, [load]);

  // เริ่ม/พัก/รีเซ็ต เปลี่ยนว่าใช้ได้ไหม → โหลดรายการใหม่เมื่อสถานะเปลี่ยน
  const onTimerChange = useCallback(
    (t: TimerData) => {
      setTimer((prev) => {
        if (prev.status !== t.status) void load();
        return t;
      });
    },
    [load],
  );

  async function applyOne(id: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/donations/${id}/timer`, { method: "POST" });
      if (!res.ok) setError(await readError(res, "ใช้กับ timer ไม่สำเร็จ"));
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function applyAll() {
    setBusy("all");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/overlays/timer/apply-all", {
        method: "POST",
      });
      if (!res.ok) {
        setError(await readError(res, "ใช้กับ timer ไม่สำเร็จ"));
      } else {
        const body = await res.json();
        setMessage(
          `ใช้แล้ว ${body.applied} รายการ · รวม ${formatDelta(body.totalSec)}`,
        );
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  const manual = round.mode === "manual";
  const items =
    filter === "pending"
      ? round.items.filter((d) => d.timer?.canApply)
      : round.items;

  return (
    // มือถือ: นาฬิกา → รายการ → ตั้งค่า · คอม: ซ้ายนาฬิกา+ตั้งค่า ขวารายการ
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <SectionCard
        className="lg:col-start-1"
        icon={Timer}
        title="นาฬิกา"
        description="มีผลกับจอ OBS ทันที"
        bodyClassName="grid gap-4"
      >
        <TimerControls
          timer={timer}
          onChange={onTimerChange}
          onError={setError}
        />
        <div className="grid gap-2">
          <span className="text-sm font-medium">ลิงก์ OBS</span>
          <ObsUrlField
            url={obsUrl}
            size={widgetSize("timer", initialSettings.styles)}
            testId="subathon-obs-url"
            copyLabel="คัดลอกลิงก์ Subathon"
          />
        </div>
      </SectionCard>

      <SectionCard
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
        icon={ListChecks}
        title="โดเนทรอบนี้"
        description={
          manual
            ? 'โหมดกดเอง — กด "ใช้" เพื่อบวก/ลดเวลาตามที่คนดูเลือก'
            : "โหมดอัตโนมัติ — เวลาบวก/ลดให้เองเมื่อโดเนทผ่าน"
        }
        bodyClassName="grid gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {manual ? (
            <SegmentedControl<Filter>
              label="ตัวกรองโดเนท"
              options={[
                {
                  value: "pending",
                  label: `รอกดใช้ (${round.pendingCount})`,
                },
                { value: "all", label: "ทั้งหมด" },
              ]}
              value={filter}
              onChange={setFilter}
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {round.items.length} รายการ
            </span>
          )}
          {manual && round.pendingCount > 0 && (
            <Button onClick={applyAll} disabled={busy !== null}>
              {busy === "all" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              ใช้ทั้งหมด ({formatDelta(round.pendingTotalSec)})
            </Button>
          )}
        </div>

        {(error || message) && (
          <p
            role="status"
            className={
              error ? "text-sm text-destructive" : "text-sm text-emerald-700"
            }
          >
            {error ?? message}
          </p>
        )}

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {timer.status === "idle" && round.items.length === 0
              ? 'กด "เริ่มนับ" แล้วโดเนทของรอบนี้จะขึ้นที่นี่'
              : filter === "pending"
                ? "ไม่มีรายการรอกดใช้"
                : "ยังไม่มีโดเนทในรอบนี้"}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border" data-testid="round-list">
            {items.map((d) => (
              <li
                key={d.id}
                data-testid="round-item"
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {d.donorName}
                    <span className="ml-2 font-mono text-muted-foreground">
                      {formatSatangNumber(d.amountSatang)} บาท
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatBangkokDateTime(d.createdAt)}
                    {d.message ? ` · ${d.message}` : ""}
                  </p>
                </div>
                {d.timer && <TimerChip timer={d.timer} />}
                {d.timer?.canApply ? (
                  <Button
                    size="sm"
                    onClick={() => applyOne(d.id)}
                    disabled={busy !== null}
                    aria-label={`ใช้เวลาของ ${d.donorName}`}
                  >
                    {busy === d.id && <Loader2 className="animate-spin" />}
                    ใช้
                  </Button>
                ) : d.timer?.appliedSec !== null &&
                  d.timer?.appliedSec !== undefined ? (
                  <span
                    data-testid="applied-mark"
                    className="flex w-12 items-center justify-end gap-1 text-xs text-muted-foreground"
                  >
                    <Check className="size-3.5" aria-hidden />
                    ใช้แล้ว
                  </span>
                ) : (
                  <span className="w-12" />
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard
        className="lg:col-start-1"
        icon={Settings2}
        title="ตั้งค่า"
        description="กฎเวลา โหมด และเวลาเริ่มต้น — หน้าตาปรับที่เมนู Overlay"
      >
        <SubathonSettings initial={initialSettings} onSaved={load} />
      </SectionCard>
    </div>
  );
}

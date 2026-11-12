"use client";

import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDuration,
  type TimerAction,
  type TimerData,
} from "@/lib/overlay-widgets";
import { cn } from "@/lib/utils";

/** ดึงสถานะใหม่เป็นระยะ (โดเนทผ่านแล้วเวลาเพิ่มจากฝั่ง server) */
const POLL_MS = 10_000;

const STATUS_LABEL: Record<TimerData["status"], string> = {
  idle: "ยังไม่เริ่ม",
  running: "กำลังนับ",
  paused: "พักอยู่",
  ended: "หมดเวลา",
};

const ADJUSTS = [-300, -60, 60, 300];

/** นาฬิกาสด + ปุ่มควบคุม subathon (มีผลทันที ไม่ต้องกดบันทึก) */
export function TimerControls({
  timer,
  onChange,
  onError,
}: {
  timer: TimerData;
  onChange: (t: TimerData) => void;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // จุดอ้างอิงของการนับถอยหลัง: เวลาที่ได้ข้อมูลล่าสุด
  const [base, setBase] = useState(() => ({
    at: Date.now(),
    sec: timer.remainingSec,
  }));
  const [now, setNow] = useState(() => Date.now());

  const update = useCallback(
    (t: TimerData) => {
      const at = Date.now();
      setBase({ at, sec: t.remainingSec });
      setNow(at);
      onChange(t);
    },
    [onChange],
  );

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.status]);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/settings/overlays/timer", {
        cache: "no-store",
      }).catch(() => null);
      if (res?.ok) update(await res.json());
    }, POLL_MS);
    return () => clearInterval(id);
  }, [update]);

  async function send(action: TimerAction, seconds?: number) {
    setBusy(action + (seconds ?? ""));
    onError(null);
    try {
      const res = await fetch("/api/settings/overlays/timer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, seconds }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        onError(body?.error?.message ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      update(body);
      setConfirmReset(false);
    } finally {
      setBusy(null);
    }
  }

  const remaining =
    timer.status === "running"
      ? Math.max(0, Math.ceil(base.sec - (now - base.at) / 1000))
      : timer.remainingSec;
  const status =
    timer.status === "running" && remaining <= 0 ? "ended" : timer.status;

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          data-testid="timer-status"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            status === "running" && "bg-green-500/10 text-green-700",
            status === "paused" && "bg-amber-500/10 text-amber-700",
            status === "ended" && "bg-red-500/10 text-red-700",
            status === "idle" && "bg-muted text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full bg-current",
              status === "running" && "animate-pulse",
            )}
            aria-hidden
          />
          {STATUS_LABEL[status]}
        </span>
        {status !== "idle" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw />
            รีเซ็ต
          </Button>
        )}
      </div>

      <p
        data-testid="timer-clock"
        className="text-center font-mono text-4xl font-semibold tabular-nums sm:text-5xl"
      >
        {formatDuration(status === "ended" ? 0 : remaining)}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {status === "idle" && (
          <Button size="lg" onClick={() => send("start")} disabled={!!busy}>
            {busy === "start" ? <Loader2 className="animate-spin" /> : <Play />}
            เริ่มนับ
          </Button>
        )}
        {status === "running" && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => send("pause")}
            disabled={!!busy}
          >
            {busy === "pause" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Pause />
            )}
            พัก
          </Button>
        )}
        {status === "paused" && timer.remainingSec > 0 && (
          <Button size="lg" onClick={() => send("resume")} disabled={!!busy}>
            {busy === "resume" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play />
            )}
            นับต่อ
          </Button>
        )}
      </div>

      {status !== "idle" && (
        <div
          className="grid grid-cols-4 gap-2"
          role="group"
          aria-label="ปรับเวลา"
        >
          {ADJUSTS.map((sec) => (
            <Button
              key={sec}
              variant="outline"
              size="sm"
              className="font-mono"
              disabled={!!busy}
              onClick={() => send("adjust", sec)}
            >
              {sec > 0 ? "+" : "−"}
              {Math.abs(sec) / 60} นาที
            </Button>
          ))}
        </div>
      )}

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รีเซ็ต subathon?</DialogTitle>
            <DialogDescription>
              เวลาที่เหลือจะหายไป แล้วกลับไปเริ่มที่เวลาเริ่มต้นเมื่อกดเริ่มนับ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              ยกเลิก
            </Button>
            <Button onClick={() => send("reset")} disabled={!!busy}>
              {busy === "reset" && <Loader2 className="animate-spin" />}
              รีเซ็ต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Timer } from "lucide-react";

import { formatDelta } from "@/lib/overlay-widgets";
import { cn } from "@/lib/utils";
import type { DonationRow } from "@/server/services/streamer-donations";

/** ป้ายเวลา Subathon ของโดเนท: ใช้แล้ว = ทึบ, รอกดใช้ = เส้นประ */
export function TimerChip({
  timer,
  className,
}: {
  timer: NonNullable<DonationRow["timer"]>;
  className?: string;
}) {
  const applied = timer.appliedSec !== null;
  const sec = timer.appliedSec ?? timer.seconds;
  const minus = sec < 0 || timer.direction === "subtract";
  const state = applied ? "ใช้แล้ว" : timer.canApply ? "รอกดใช้" : "ยังไม่ใช้";
  return (
    <span
      data-testid="timer-chip"
      title={`Subathon ${minus ? "ลด" : "เพิ่ม"}เวลา · ${state}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs whitespace-nowrap",
        minus
          ? "border-red-500/40 text-red-600 dark:text-red-400"
          : "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
        applied && (minus ? "bg-red-500/10" : "bg-emerald-500/10"),
        !applied && timer.canApply && "border-dashed",
        !applied && !timer.canApply && "opacity-60",
        className,
      )}
    >
      <Timer className="size-3" aria-hidden />
      {formatDelta(sec)}
      <span className="sr-only"> {state}</span>
    </span>
  );
}

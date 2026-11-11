import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

type DonationStatus = Database["public"]["Enums"]["donation_status"];

const STATUS: Record<DonationStatus, { label: string; dot: string }> = {
  approved: { label: "ผ่าน", dot: "bg-green-500" },
  pending_review: { label: "รอตรวจ", dot: "bg-amber-500" },
  rejected: { label: "ไม่ผ่าน", dot: "bg-red-500" },
  verifying: { label: "กำลังตรวจ", dot: "bg-sky-500" },
  awaiting_slip: { label: "ยังไม่แนบสลิป", dot: "bg-neutral-300" },
  expired: { label: "หมดเวลา", dot: "bg-neutral-300" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: DonationStatus;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

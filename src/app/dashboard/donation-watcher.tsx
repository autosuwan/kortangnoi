"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import {
  DONATIONS_CHANGED_EVENT,
  PENDING_COUNT_EVENT,
  type PendingCountDetail,
} from "@/lib/dashboard-events";
import { formatSatangNumber } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";

async function publishPendingCount() {
  const res = await fetch("/api/donations/summary", { cache: "no-store" });
  if (!res.ok) return;
  const { pendingCount } = await res.json();
  window.dispatchEvent(
    new CustomEvent<PendingCountDetail>(PENDING_COUNT_EVENT, {
      detail: { count: pendingCount },
    }),
  );
}

/**
 * ฟังรายการโดเนทของตัวเองแบบ realtime (postgres_changes + RLS เห็นแค่แถวตัวเอง)
 * รายการรอตรวจใหม่ → toast + อัปเดต badge ที่เมนู; หน้าอื่นรีเฟรชข้อมูลเอง
 */
export function DonationWatcher({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    publishPendingCount();
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`donations:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donations",
            filter: `streamer_id=eq.${userId}`,
          },
          (change) => {
            const row = change.new as {
              status?: string;
              donor_name?: string;
              amount_satang?: number;
            };
            if (
              change.eventType === "UPDATE" &&
              row.status === "pending_review"
            ) {
              toast("มีโดเนทรอตรวจ", {
                description: `${row.donor_name} · ${formatSatangNumber(row.amount_satang ?? 0)} บาท`,
                action: {
                  label: "ดู",
                  onClick: () =>
                    router.push("/dashboard/donations?status=pending_review"),
                },
              });
            }
            window.dispatchEvent(new Event(DONATIONS_CHANGED_EVENT));
            publishPendingCount();
            router.refresh();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}

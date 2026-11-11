"use client";

import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBangkokDateTime } from "@/lib/bangkok-time";
import { DONATIONS_CHANGED_EVENT } from "@/lib/dashboard-events";
import { formatSatangNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DonationRow } from "@/server/services/streamer-donations";

import { DonationDrawer } from "./donation-drawer";
import { StatusBadge } from "./status-badge";

const FILTERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending_review", label: "รอตรวจ" },
  { value: "approved", label: "ผ่าน" },
  { value: "rejected", label: "ไม่ผ่าน" },
  { value: "unpaid", label: "ยังไม่จ่าย" },
] as const;

type ListResponse = {
  items: DonationRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function DonationsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "all";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const openId = params.get("open");

  const [list, setList] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/donations?status=${status}&page=${page}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError("โหลดรายการไม่สำเร็จ ลองรีเฟรช");
      return;
    }
    setError(null);
    setList(await res.json());
  }, [status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดตามตัวกรอง/หน้า
    load();
    // realtime: มีรายการเปลี่ยน → โหลดใหม่
    window.addEventListener(DONATIONS_CHANGED_EVENT, load);
    return () => window.removeEventListener(DONATIONS_CHANGED_EVENT, load);
  }, [load]);

  function setQuery(next: Record<string, string | null>) {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.replace(`${pathname}?${q}`, { scroll: false });
  }

  const totalPages = list
    ? Math.max(1, Math.ceil(list.total / list.pageSize))
    : 1;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="กรองสถานะ"
        className="flex w-full gap-1 overflow-x-auto rounded-lg border bg-card p-0.5 text-sm sm:w-fit"
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={status === f.value}
            onClick={() => setQuery({ status: f.value, page: null })}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 transition-colors",
              status === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        {error ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            {error}
          </p>
        ) : !list ? (
          <div role="status" aria-label="กำลังโหลด" className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
            <Inbox className="size-8" aria-hidden />
            <p>ยังไม่มีรายการ</p>
          </div>
        ) : (
          <>
            {/* desktop: ตาราง */}
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-normal">เวลา</th>
                  <th className="px-5 py-3 font-normal">ชื่อ</th>
                  <th className="px-5 py-3 text-right font-normal">
                    ยอด (บาท)
                  </th>
                  <th className="px-5 py-3 font-normal">ข้อความ</th>
                  <th className="px-5 py-3 font-normal">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.items.map((d) => (
                  <tr
                    key={d.id}
                    data-testid="donation-row"
                    onClick={() => setQuery({ open: d.id })}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatBangkokDateTime(d.createdAt)}
                    </td>
                    <td className="max-w-40 truncate px-5 py-3 font-medium">
                      <button
                        type="button"
                        className="truncate text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuery({ open: d.id });
                        }}
                      >
                        {d.donorName}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {formatSatangNumber(d.amountSatang)}
                    </td>
                    <td className="max-w-64 truncate px-5 py-3 text-muted-foreground">
                      {d.message}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* มือถือ: การ์ดเรียงลง */}
            <ul className="divide-y md:hidden">
              {list.items.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    data-testid="donation-card"
                    onClick={() => setQuery({ open: d.id })}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {d.donorName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatBangkokDateTime(d.createdAt)}
                        {d.message ? ` · ${d.message}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono">
                        {formatSatangNumber(d.amountSatang)}
                      </span>
                      <StatusBadge status={d.status} className="text-xs" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {list && list.total > list.pageSize && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            หน้า {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="หน้าก่อน"
            disabled={page <= 1}
            onClick={() => setQuery({ page: String(page - 1) })}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="หน้าถัดไป"
            disabled={page >= totalPages}
            onClick={() => setQuery({ page: String(page + 1) })}
          >
            <ChevronRight />
          </Button>
        </div>
      )}

      <DonationDrawer
        id={openId}
        onClose={() => setQuery({ open: null })}
        onChanged={load}
      />
    </div>
  );
}

import { ArrowRight, Hourglass } from "lucide-react";
import Link from "next/link";

import { formatBangkokDateTime } from "@/lib/bangkok-time";
import { formatSatangNumber } from "@/lib/money";
import { requireUser } from "@/server/auth";
import {
  getDonationSummary,
  listDonations,
} from "@/server/services/streamer-donations";

import { StatusBadge } from "./donations/status-badge";

/** ตัวเลขใหญ่ สตางค์สีเทา */
function Money({ satang, testId }: { satang: number; testId: string }) {
  const [baht, st] = formatSatangNumber(satang).split(".");
  return (
    <p data-testid={testId} className="mt-1 font-mono text-3xl font-semibold">
      {baht}
      <span className="text-muted-foreground">.{st ?? "00"}</span>
      <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">
        บาท
      </span>
    </p>
  );
}

/** หน้าหลัก dashboard (F5): ยอดวันนี้/เดือนนี้, รอตรวจ, โดเนทล่าสุด */
export async function DashboardSummary() {
  const user = await requireUser();
  const [summary, latest] = await Promise.all([
    getDonationSummary(user.id),
    listDonations(user.id),
  ]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm text-muted-foreground">ยอดวันนี้</h2>
          <Money satang={summary.todaySatang} testId="today-total" />
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm text-muted-foreground">ยอดเดือนนี้</h2>
          <Money satang={summary.monthSatang} testId="month-total" />
        </section>
        <Link
          href="/dashboard/donations?status=pending_review"
          className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50"
        >
          <h2 className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Hourglass className="size-3.5" aria-hidden />
            รอตรวจ
          </h2>
          <p className="mt-1 flex items-baseline justify-between">
            <span
              data-testid="pending-count"
              className="font-mono text-3xl font-semibold"
            >
              {summary.pendingCount}
            </span>
            <ArrowRight
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </p>
        </Link>
      </div>

      <section className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-medium">โดเนทล่าสุด</h2>
          <Link
            href="/dashboard/donations"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ดูทั้งหมด
          </Link>
        </div>
        {latest.items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            ยังไม่มีโดเนท — แชร์ลิงก์โดเนทด้านล่างให้ผู้ชมได้เลย
          </p>
        ) : (
          <ul className="divide-y">
            {latest.items.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/donations?open=${d.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/50"
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
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono">
                      {formatSatangNumber(d.amountSatang)}
                    </span>
                    <StatusBadge
                      status={d.status}
                      className="hidden text-xs sm:inline-flex"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

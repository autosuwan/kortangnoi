import { ArrowRight, Hourglass, Inbox, ReceiptText } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/dashboard/empty-state";
import { SectionCard } from "@/components/dashboard/section-card";
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
    <p
      data-testid={testId}
      className="mt-1 font-mono text-2xl font-semibold sm:text-3xl"
    >
      {baht}
      <span className="text-muted-foreground">.{st ?? "00"}</span>
      <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">
        บาท
      </span>
    </p>
  );
}

const statCard = "rounded-2xl border bg-card p-4 sm:p-5";

/** หน้าหลัก dashboard (F5): ยอดวันนี้/เดือนนี้, รอตรวจ, โดเนทล่าสุด */
export async function DashboardSummary() {
  const user = await requireUser();
  const [summary, latest] = await Promise.all([
    getDonationSummary(user.id),
    listDonations(user.id),
  ]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <section className={statCard}>
          <h2 className="text-sm text-muted-foreground">ยอดวันนี้</h2>
          <Money satang={summary.todaySatang} testId="today-total" />
        </section>
        <section className={statCard}>
          <h2 className="text-sm text-muted-foreground">ยอดเดือนนี้</h2>
          <Money satang={summary.monthSatang} testId="month-total" />
        </section>
        <Link
          href="/dashboard/donations?status=pending_review"
          className={`${statCard} group col-span-2 flex items-center justify-between transition-colors hover:border-primary/50 lg:col-span-1 lg:block`}
        >
          <span>
            <h2 className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Hourglass className="size-3.5" aria-hidden />
              รอตรวจ
            </h2>
            <span
              data-testid="pending-count"
              className="mt-1 block font-mono text-2xl font-semibold sm:text-3xl"
            >
              {summary.pendingCount}
            </span>
          </span>
          <ArrowRight
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:float-right lg:-mt-6"
            aria-hidden
          />
        </Link>
      </div>

      <SectionCard
        icon={ReceiptText}
        title="โดเนทล่าสุด"
        action={
          <Link
            href="/dashboard/donations"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ดูทั้งหมด
          </Link>
        }
        bodyClassName="px-0 pb-2"
      >
        {latest.items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="ยังไม่มีโดเนท"
            description="แชร์ลิงก์โดเนทด้านล่างให้ผู้ชมได้เลย"
          />
        ) : (
          <ul className="divide-y border-t">
            {latest.items.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/donations?open=${d.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 text-sm hover:bg-muted/50"
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
                  <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="font-mono">
                      {formatSatangNumber(d.amountSatang)}
                    </span>
                    <StatusBadge status={d.status} className="text-xs" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

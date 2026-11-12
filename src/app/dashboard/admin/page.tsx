import {
  ChartColumn,
  CircleAlert,
  CircleCheck,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/dashboard/section-card";
import { formatBangkokDateTime } from "@/lib/bangkok-time";
import { FREE_MONTHLY_QUOTA, quotaLevel } from "@/lib/slipok-quota";
import { cn } from "@/lib/utils";
import { isAdmin, requireUser } from "@/server/auth";
import { getSlipOkQuota } from "@/server/integrations/slipok";
import { getAdminStats } from "@/server/services/admin";

import { PageHeader } from "../page-header";
import { SummarySkeleton } from "../skeletons";

export const metadata: Metadata = {
  title: "แอดมิน · KORTANGNOI",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <PageHeader title="แอดมิน" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <Suspense fallback={<SummarySkeleton />}>
          <AdminContent />
        </Suspense>
      </main>
    </>
  );
}

const fmtDate = (d: string | null) =>
  d
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "Asia/Bangkok",
      }).format(new Date(d))
    : "–";

async function AdminContent() {
  const user = await requireUser();
  // ไม่ใช่แอดมิน → 404 เหมือนไม่มีหน้านี้
  if (!isAdmin(user.id)) notFound();
  const [quota, stats] = await Promise.all([getSlipOkQuota(), getAdminStats()]);
  const level = quota ? quotaLevel(quota) : null;

  return (
    <div className="grid gap-4">
      <PageTitle
        title="แอดมิน"
        description="สถานะระบบ ตรวจสลิป และ error ล่าสุด"
        className="mb-2"
      />

      <SectionCard
        icon={ScanLine}
        title="โควตา SlipOK"
        description="รีเฟรชทุก 60 วินาที"
      >
        {!quota ? (
          <p role="alert" className="text-sm text-destructive">
            ดึงข้อมูลโควตาไม่ได้ — เช็ก SLIPOK_API_KEY / SLIPOK_BRANCH_ID
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span
                data-testid="quota-remaining"
                className="font-mono text-4xl font-semibold"
              >
                {quota.quota}
              </span>
              <span className="text-sm text-muted-foreground">สลิปคงเหลือ</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  level === "ok" && "bg-green-500",
                  level === "low" && "bg-amber-500",
                  level === "empty" && "bg-red-500",
                )}
                style={{
                  width: `${Math.min(100, (quota.quota / FREE_MONTHLY_QUOTA) * 100)}%`,
                }}
              />
            </div>
            {level !== "ok" && (
              <p
                role="alert"
                className={cn(
                  "mt-3 flex items-center gap-1.5 text-sm",
                  level === "empty" ? "text-destructive" : "text-amber-700",
                )}
              >
                <TriangleAlert className="size-4" aria-hidden />
                {level === "empty"
                  ? "โควตาหมด — โดเนทใหม่จะไปรอตรวจทั้งหมด (เติมแพ็กเกจที่ SlipOK)"
                  : "โควตาใกล้หมด"}
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">ใช้เกิน</dt>
                <dd className="font-mono">{quota.overQuota}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">โควตาพิเศษ</dt>
                <dd className="font-mono">{quota.specialQuota}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">แพ็กเกจหมดอายุ</dt>
                <dd>{fmtDate(quota.endDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">โควตาพิเศษหมดอายุ</dt>
                <dd>{fmtDate(quota.specialEndDate)}</dd>
              </div>
            </dl>
          </>
        )}
      </SectionCard>

      <SectionCard
        icon={ChartColumn}
        title="สลิปที่ตรวจเดือนนี้"
        description="ทุกสตรีมเมอร์ นับเฉพาะรายการที่แนบสลิปแล้ว"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            [
              "ผ่าน",
              stats.monthChecks.approved,
              "bg-green-500",
              "checks-approved",
            ],
            [
              "รอตรวจ",
              stats.monthChecks.pendingReview,
              "bg-amber-500",
              "checks-pending",
            ],
            [
              "ไม่ผ่าน",
              stats.monthChecks.rejected,
              "bg-red-500",
              "checks-rejected",
            ],
          ].map(([label, value, dot, id]) => (
            <div key={id as string} className="rounded-xl border p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span
                  className={cn("size-2 rounded-full", dot as string)}
                  aria-hidden
                />
                {label}
              </p>
              <p
                data-testid={id as string}
                className="mt-1 font-mono text-2xl font-semibold"
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={CircleAlert}
        title="error ล่าสุด"
        bodyClassName="px-0 pb-0"
      >
        {stats.recentErrors.length === 0 ? (
          <EmptyState icon={CircleCheck} title="ยังไม่มี error" />
        ) : (
          <ul data-testid="recent-errors" className="divide-y border-t text-sm">
            {stats.recentErrors.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-0.5 px-6 py-3 sm:flex-row sm:gap-4"
              >
                <span className="shrink-0 text-muted-foreground sm:w-36">
                  {formatBangkokDateTime(e.createdAt)}
                </span>
                <span className="shrink-0 font-mono sm:w-28">
                  {e.source} {e.code}
                </span>
                <span className="min-w-0 break-words">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

import { ArrowRight, Circle, Link2, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/dashboard/section-card";
import { publicEnv } from "@/lib/env";
import { requireStreamer } from "@/server/auth";
import { getOverlayUrl } from "@/server/services/overlay";
import { getPaymentSettings } from "@/server/services/payment";
import { getMe } from "@/server/services/profile";

import { ObsLinkCard } from "./obs-link-card";
import { PageHeader } from "./page-header";
import { SETUP_STEPS } from "@/lib/setup-steps";
import { SummarySkeleton } from "./skeletons";
import { DashboardSummary } from "./summary";

export const metadata: Metadata = { title: "หน้าหลัก · KORTANGNOI" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="หน้าหลัก" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <Suspense fallback={<SummarySkeleton />}>
          <Home />
        </Suspense>
      </main>
    </>
  );
}

async function Home() {
  const user = await requireStreamer();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");
  const [payment, overlayUrl] = await Promise.all([
    getPaymentSettings(user.id),
    getOverlayUrl(user.id),
  ]);
  const donateUrl = `${publicEnv.siteUrl.replace(/\/$/, "")}/${me.username}`;

  return (
    <div className="grid gap-4">
      <PageTitle
        title={`สวัสดี ${me.displayName || me.username}`}
        description="ภาพรวมโดเนทของคุณ"
        actions={
          payment.enabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-600/20 bg-green-50 px-3 py-1 text-sm text-green-700">
              <span className="size-2 rounded-full bg-green-500" aria-hidden />
              เปิดรับโดเนทแล้ว
            </span>
          ) : null
        }
      />

      {!payment.enabled && <GettingStarted />}

      <DashboardSummary />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <SectionCard
          icon={Link2}
          title="ลิงก์โดเนทของคุณ"
          description="แปะในไลฟ์ หรือใส่ในคำอธิบายช่อง"
        >
          <p
            data-testid="donate-url"
            className="rounded-lg border bg-background px-3 py-2 font-mono text-sm break-all"
          >
            {donateUrl}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton text={donateUrl} label="คัดลอกลิงก์" />
            <Link
              href={`/${me.username}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              เปิดดูหน้าโดเนท
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </SectionCard>
        <ObsLinkCard initialUrl={overlayUrl} />
      </div>
    </div>
  );
}

/** แสดงจนกว่าจะเปิดรับโดเนท — พาสตรีมเมอร์ใหม่ตั้งค่าทีละขั้น (`?setup=1`) */
function GettingStarted() {
  return (
    <SectionCard
      icon={Rocket}
      title="เริ่มต้นใช้งาน 3 ขั้น"
      description="ทำครบแล้วผู้ชมโดเนทได้ และ alert ขึ้นจอไลฟ์"
      className="border-primary/30"
    >
      <Link
        href={SETUP_STEPS[0].href}
        className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10"
      >
        <span>
          <span className="font-medium">ยังไม่เปิดรับโดเนท</span>
          <span className="block text-muted-foreground">
            เริ่มตั้งค่าทีละขั้น ใช้เวลาไม่กี่นาที
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
          เริ่มตั้งค่า
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
      <ol className="grid gap-2 text-sm sm:grid-cols-3">
        {SETUP_STEPS.map((step, i) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex h-full items-start gap-2 rounded-lg border bg-background p-3 hover:border-primary/50"
            >
              <Circle
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>
                <span className="text-xs text-muted-foreground">
                  ขั้นที่ {i + 1}
                </span>
                <span className="block">{step.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

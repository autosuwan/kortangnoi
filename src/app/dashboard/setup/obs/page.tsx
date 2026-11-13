import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/dashboard/section-card";
import { publicEnv } from "@/lib/env";
import { requireStreamer } from "@/server/auth";
import { getOverlayUrl } from "@/server/services/overlay";
import { getMe } from "@/server/services/profile";
import { getSetupProgress } from "@/server/services/setup";

import { ObsLinkCard } from "../../obs-link-card";
import { PageHeader } from "../../page-header";
import { SetupSteps } from "../../setup-steps";
import { SummarySkeleton } from "../../skeletons";
import { TestAlertButton } from "../../test-alert-button";
import { FinishBar } from "./finish-bar";

export const metadata: Metadata = { title: "เชื่อม OBS · KORTANGNOI" };

/** ตั้งค่าครั้งแรก ขั้นที่ 3: ใส่ลิงก์ OBS + ทดสอบ alert */
export default function SetupObsPage() {
  return (
    <>
      <PageHeader title="เชื่อม OBS" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-32 md:px-6">
        <Suspense fallback={<SummarySkeleton />}>
          <Content />
        </Suspense>
      </main>
      <FinishBar />
    </>
  );
}

async function Content() {
  const user = await requireStreamer();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");
  const [overlayUrl, progress] = await Promise.all([
    getOverlayUrl(user.id),
    getSetupProgress(user.id),
  ]);
  const donateUrl = `${publicEnv.siteUrl.replace(/\/$/, "")}/${me.username}`;

  return (
    <div className="grid gap-4">
      <SetupSteps current={3} done={progress.done} />
      <PageTitle
        title="เชื่อม OBS"
        description="ใส่ลิงก์ในโปรแกรมไลฟ์ แล้วลองส่ง alert ทดสอบให้ขึ้นจอ"
        className="mb-2"
      />
      <ObsLinkCard initialUrl={overlayUrl} testBelow />
      <SectionCard
        title="ทดสอบ alert"
        description="ใส่ลิงก์ใน OBS แล้วกดปุ่มนี้ ถ้า alert ขึ้นจอแปลว่าพร้อมไลฟ์"
      >
        <TestAlertButton
          className="mt-0 px-0"
          hint="ใช้หน้าตา alert ที่บันทึกไว้"
          refreshOnSent
        />
      </SectionCard>
      <SectionCard
        icon={Link2}
        title="ลิงก์โดเนทของคุณ"
        description="แปะในไลฟ์ หรือใส่ในคำอธิบายช่อง ผู้ชมเข้ามาโดเนทผ่านลิงก์นี้"
      >
        <p className="rounded-lg border bg-background px-3 py-2 font-mono text-sm break-all">
          {donateUrl}
        </p>
        <div className="mt-2">
          <CopyButton text={donateUrl} label="คัดลอกลิงก์" />
        </div>
      </SectionCard>
    </div>
  );
}

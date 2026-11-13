import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageTitle } from "@/components/dashboard/page-title";
import { requireStreamer } from "@/server/auth";
import { getAlertSettings } from "@/server/services/alert";
import { getMe } from "@/server/services/profile";
import { getSetupProgress } from "@/server/services/setup";

import { PageHeader } from "../page-header";
import { SetupSteps } from "../setup-steps";
import { AlertFormSkeleton } from "../skeletons";
import { AlertForm } from "./alert-form";

export const metadata: Metadata = { title: "ตั้งค่า alert · KORTANGNOI" };

export default function AlertPage({
  searchParams,
}: PageProps<"/dashboard/alert">) {
  return (
    <>
      {/* ปุ่มฟังเสียงอ่าน (Google แปลภาษา) ไม่ส่ง referrer ของเว็บเรา */}
      <meta name="referrer" content="no-referrer" />
      <PageHeader title="ตั้งค่า alert" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <Suspense fallback={null}>
          <SetupBanner searchParams={searchParams} />
        </Suspense>
        <PageTitle
          title="ตั้งค่า alert"
          description="หน้าตา alert ที่เด้งบนจอไลฟ์เมื่อมีคนโดเนท"
        />
        <Suspense fallback={<AlertFormSkeleton />}>
          <LoadedForm searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function SetupBanner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if ((await searchParams).setup !== "1") return null;
  const user = await requireStreamer();
  const { done } = await getSetupProgress(user.id);
  return <SetupSteps current={2} done={done} />;
}

async function LoadedForm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const setup = (await searchParams).setup === "1";
  const user = await requireStreamer();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");

  return (
    <AlertForm
      initial={await getAlertSettings(user.id)}
      userId={user.id}
      setup={setup}
    />
  );
}

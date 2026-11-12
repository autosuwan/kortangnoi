import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageTitle } from "@/components/dashboard/page-title";
import { requireUser } from "@/server/auth";
import { getAlertSettings } from "@/server/services/alert";
import { getMe } from "@/server/services/profile";

import { PageHeader } from "../page-header";
import { AlertFormSkeleton } from "../skeletons";
import { AlertForm } from "./alert-form";

export const metadata: Metadata = { title: "ตั้งค่า alert · KORTANGNOI" };

export default function AlertPage() {
  return (
    <>
      {/* ปุ่มฟังเสียงอ่าน (Google แปลภาษา) ไม่ส่ง referrer ของเว็บเรา */}
      <meta name="referrer" content="no-referrer" />
      <PageHeader title="ตั้งค่า alert" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <PageTitle
          title="ตั้งค่า alert"
          description="หน้าตา alert ที่เด้งบนจอไลฟ์เมื่อมีคนโดเนท"
        />
        <Suspense fallback={<AlertFormSkeleton />}>
          <LoadedForm />
        </Suspense>
      </main>
    </>
  );
}

async function LoadedForm() {
  const user = await requireUser();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");

  return (
    <AlertForm initial={await getAlertSettings(user.id)} userId={user.id} />
  );
}

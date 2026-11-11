import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
      <PageHeader title="ตั้งค่า alert" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-medium">ตั้งค่า alert</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          หน้าตา alert ที่เด้งบนจอไลฟ์เมื่อมีคนโดเนท
        </p>
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

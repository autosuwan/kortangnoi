import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/server/auth";
import { getPaymentSettings } from "@/server/services/payment";
import { getMe } from "@/server/services/profile";

import { PageHeader } from "../page-header";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "ช่องทางรับเงิน · KORTANGNOI" };

export default function PaymentPage() {
  return (
    <>
      <PageHeader title="ช่องทางรับเงิน" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-medium">ช่องทางรับเงิน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          เงินโดเนทโอนตรงเข้าพร้อมเพย์ของคุณ ระบบไม่ได้ถือเงินไว้
        </p>
        <Suspense
          fallback={<div className="mt-6 h-96 rounded-2xl border bg-card" />}
        >
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

  return <PaymentForm initial={await getPaymentSettings(user.id)} />;
}

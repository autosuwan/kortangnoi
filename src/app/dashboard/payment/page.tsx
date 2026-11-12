import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/server/auth";
import { getPaymentSettings } from "@/server/services/payment";
import { getMe } from "@/server/services/profile";

import { PageHeader } from "../page-header";
import { PaymentFormSkeleton } from "../skeletons";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "ช่องทางรับเงิน · KORTANGNOI" };

export default function PaymentPage() {
  return (
    <>
      <PageHeader title="ช่องทางรับเงิน" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <Suspense fallback={<PaymentFormSkeleton />}>
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
    <PaymentForm
      initial={await getPaymentSettings(user.id)}
      streamerName={me.displayName || me.username}
    />
  );
}

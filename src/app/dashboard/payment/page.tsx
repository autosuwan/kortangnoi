import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireStreamer } from "@/server/auth";
import { getPaymentSettings } from "@/server/services/payment";
import { getMe } from "@/server/services/profile";
import { getSetupProgress } from "@/server/services/setup";

import { PageHeader } from "../page-header";
import { PaymentFormSkeleton } from "../skeletons";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "ช่องทางรับเงิน · KORTANGNOI" };

export default function PaymentPage({
  searchParams,
}: PageProps<"/dashboard/payment">) {
  return (
    <>
      <PageHeader title="ช่องทางรับเงิน" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <Suspense fallback={<PaymentFormSkeleton />}>
          <LoadedForm searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
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

  const progress = setup ? await getSetupProgress(user.id) : null;
  return (
    <PaymentForm
      initial={await getPaymentSettings(user.id)}
      streamerName={me.displayName || me.username}
      setup={progress}
    />
  );
}

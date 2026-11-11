import { ArrowRight, Link2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { publicEnv } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { getPaymentSettings } from "@/server/services/payment";
import { getMe } from "@/server/services/profile";

import { PageHeader } from "./page-header";

export const metadata: Metadata = { title: "หน้าหลัก · KORTANGNOI" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="หน้าหลัก" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Suspense
          fallback={<div className="h-40 rounded-2xl border bg-card" />}
        >
          <Welcome />
        </Suspense>
      </main>
    </>
  );
}

async function Welcome() {
  const user = await requireUser();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");
  const payment = await getPaymentSettings(user.id);

  const donateUrl = `${publicEnv.siteUrl.replace(/\/$/, "")}/${me.username}`;

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-medium">
        สวัสดี{me.displayName ? ` ${me.displayName}` : ""}
      </h1>
      {payment.enabled ? (
        <p className="mt-1 text-sm text-muted-foreground">
          เปิดรับโดเนทแล้ว เอาลิงก์นี้ไปแปะในไลฟ์ได้เลย
        </p>
      ) : (
        <Link
          href="/dashboard/payment"
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10"
        >
          <span>
            <span className="font-medium">ยังไม่เปิดรับโดเนท</span>
            <span className="block text-muted-foreground">
              ตั้งค่าพร้อมเพย์ก่อน ผู้ชมถึงจะโอนได้
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
        </Link>
      )}
      <div className="mt-6">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="size-4 text-muted-foreground" aria-hidden />
          ลิงก์โดเนทของคุณ
        </p>
        <p
          data-testid="donate-url"
          className="mt-2 rounded-lg border bg-background px-3 py-2 font-mono text-sm break-all"
        >
          {donateUrl}
        </p>
      </div>
    </section>
  );
}

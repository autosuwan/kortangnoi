import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { publicEnv } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { getMe } from "@/server/services/profile";

export const metadata: Metadata = { title: "หน้าหลัก · KORTANGNOI" };

export default function DashboardPage() {
  return (
    <>
      <header className="flex h-14 items-center border-b px-6 text-sm">
        <span className="text-muted-foreground">KORTANGNOI</span>
        <span className="mx-2 text-muted-foreground">/</span>
        <span>หน้าหลัก</span>
      </header>
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

  const donateUrl = `${publicEnv.siteUrl.replace(/\/$/, "")}/${me.username}`;

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-medium">
        สวัสดี{me.displayName ? ` ${me.displayName}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ขั้นต่อไป: ตั้งค่าช่องทางรับเงิน แล้วเอาลิงก์นี้ไปแปะในไลฟ์
      </p>
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

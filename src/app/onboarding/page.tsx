import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { publicEnv } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { getMe } from "@/server/services/profile";

import { UsernameForm } from "./username-form";

export const metadata: Metadata = { title: "ตั้งชื่อลิงก์ · KORTANGNOI" };

export default function OnboardingPage() {
  return (
    <main className="app-bg flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8">
        <p className="font-mono text-xs text-muted-foreground">เริ่มต้นใช้งาน</p>
        <h1 className="mt-2 text-2xl font-medium">ตั้งชื่อลิงก์โดเนทของคุณ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ผู้ชมจะเข้าหน้าโดเนทผ่านลิงก์นี้ เปลี่ยนทีหลังได้
        </p>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="กำลังโหลด"
              className="mt-6 flex flex-col gap-4"
            >
              <div className="grid gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          }
        >
          <OnboardingForm />
        </Suspense>
      </div>
    </main>
  );
}

async function OnboardingForm() {
  const user = await requireUser();
  const me = await getMe(user.id);
  if (me.username) redirect("/dashboard");

  return <UsernameForm siteUrl={publicEnv.siteUrl} />;
}

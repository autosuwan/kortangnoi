import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth";
import { getMyApplication } from "@/server/services/application";
import { getMe } from "@/server/services/profile";

import { ApplyView } from "./apply-view";

export const metadata: Metadata = {
  title: "สมัครเป็นสตรีมเมอร์ · KORTANGNOI",
  robots: { index: false, follow: false },
};

export default function ApplyPage() {
  return (
    <main className="app-bg flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <Logo className="h-10" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="กำลังโหลด"
              className="mt-8 grid gap-4"
            >
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          }
        >
          <Loaded />
        </Suspense>
      </div>
    </main>
  );
}

async function Loaded() {
  const user = await requireUser();
  const mine = await getMyApplication(user.id);
  if (mine.status === "approved") {
    const me = await getMe(user.id);
    redirect(me.username ? "/dashboard" : "/onboarding");
  }
  return <ApplyView initial={mine} />;
}

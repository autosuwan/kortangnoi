import { LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Toaster } from "sonner";

import { LogoMark } from "@/components/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCurrentUser } from "@/server/auth";

import { DonationWatcher } from "./donation-watcher";
import { SidebarNav } from "./sidebar-nav";

/** โครง dashboard แบบ Studio: sidebar ไอคอนแคบ + พื้นที่เนื้อหา */
export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 flex h-dvh w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3">
        <Link
          href="/dashboard"
          aria-label="KORTANGNOI"
          className="mb-3 flex size-9 items-center justify-center"
        >
          <LogoMark />
        </Link>
        <SidebarNav />
        <form action="/auth/signout" method="post" className="mt-auto">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="submit"
                  aria-label="ออกจากระบบ"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                />
              }
            >
              <LogOut className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="right">ออกจากระบบ</TooltipContent>
          </Tooltip>
        </form>
      </aside>
      <div className="app-bg flex min-w-0 flex-1 flex-col">{children}</div>
      <Suspense fallback={null}>
        <Watcher />
      </Suspense>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

async function Watcher() {
  const user = await getCurrentUser();
  return user ? <DonationWatcher userId={user.id} /> : null;
}

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
import { getCurrentUser, isAdmin } from "@/server/auth";

import { DonationWatcher } from "./donation-watcher";
import { SidebarNav } from "./sidebar-nav";

/** โครง dashboard แบบ Studio: sidebar ไอคอนแคบ + พื้นที่เนื้อหา */
export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    // เต็มจอพอดี: sidebar อยู่กับที่ เลื่อนเฉพาะพื้นที่เนื้อหา (header ติดบนในนั้น)
    <div className="flex h-dvh min-h-0 shrink-0 overflow-hidden">
      <aside className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3">
        <Link
          href="/dashboard"
          aria-label="KORTANGNOI"
          className="mb-3 flex size-9 items-center justify-center"
        >
          <LogoMark />
        </Link>
        <Suspense fallback={<SidebarNav />}>
          <NavWithRole />
        </Suspense>
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
      <div
        data-testid="dashboard-scroll"
        className="app-bg flex min-w-0 flex-1 flex-col overflow-y-auto"
      >
        {children}
      </div>
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

async function NavWithRole() {
  const user = await getCurrentUser();
  return <SidebarNav isAdmin={user ? isAdmin(user.id) : false} />;
}

import { LogOut } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/logo";

/** แถบหัวหน้าแบบ breadcrumb ของทุกหน้าใน dashboard (มือถือมีโลโก้ + ออกจากระบบ เพราะไม่มีแถบซ้าย) */
export function PageHeader({ title }: { title: string }) {
  return (
    <header
      data-testid="page-header"
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 text-sm backdrop-blur md:px-6"
    >
      <Link href="/dashboard" aria-label="KORTANGNOI" className="md:hidden">
        <LogoMark className="size-7" />
      </Link>
      <span className="hidden text-muted-foreground md:inline">KORTANGNOI</span>
      <span className="hidden text-muted-foreground md:inline">/</span>
      <span className="truncate font-medium md:font-normal">{title}</span>
      <form action="/auth/signout" method="post" className="ml-auto md:hidden">
        <button
          type="submit"
          aria-label="ออกจากระบบ"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </header>
  );
}

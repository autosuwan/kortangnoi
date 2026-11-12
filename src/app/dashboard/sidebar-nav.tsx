"use client";

import {
  Bell,
  House,
  ReceiptText,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PENDING_COUNT_EVENT,
  type PendingCountDetail,
} from "@/lib/dashboard-events";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  /** แสดงจำนวนรายการรอตรวจ (realtime จาก DonationWatcher) */
  badge?: boolean;
};

// เมนูที่ยังไม่ทำแสดงไว้แบบ "เร็วๆ นี้" — เปิดใช้ตอนทำ feature นั้น
const items: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: House },
  {
    href: "/dashboard/donations",
    label: "ประวัติโดเนท",
    icon: ReceiptText,
    badge: true,
  },
  {
    href: "/dashboard/payment",
    label: "ช่องทางรับเงิน",
    icon: Wallet,
  },
  { href: "/dashboard/alert", label: "ตั้งค่า alert", icon: Bell },
  { href: "/dashboard/profile", label: "โปรไฟล์", icon: UserRound },
];

const itemClass =
  "relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors";

export function SidebarNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const onCount = (e: Event) =>
      setPending((e as CustomEvent<PendingCountDetail>).detail.count);
    window.addEventListener(PENDING_COUNT_EVENT, onCount);
    return () => window.removeEventListener(PENDING_COUNT_EVENT, onCount);
  }, []);

  return (
    <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, soon, badge }) => {
        const active = pathname === href;
        return (
          <Tooltip key={href}>
            <TooltipTrigger
              render={
                soon ? (
                  <span
                    aria-disabled
                    className={cn(itemClass, "cursor-not-allowed opacity-40")}
                  />
                ) : (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      itemClass,
                      "hover:bg-sidebar-accent hover:text-foreground",
                      active && "bg-sidebar-accent text-foreground",
                    )}
                  />
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{label}</span>
              {badge && pending > 0 && (
                <span
                  data-testid="pending-badge"
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] leading-none text-primary-foreground"
                >
                  {pending > 99 ? "99+" : pending}
                  <span className="sr-only"> รายการรอตรวจ</span>
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {soon ? `${label} · เร็วๆ นี้` : label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

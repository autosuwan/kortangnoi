"use client";

import {
  Bell,
  House,
  Layers,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Wallet,
  type LucideIcon,
  Timer,
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
  /** ชื่อสั้นสำหรับแถบเมนูล่างจอบนมือถือ */
  shortLabel: string;
  icon: LucideIcon;
  /** แสดงจำนวนรายการรอตรวจ (realtime จาก DonationWatcher) */
  badge?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", shortLabel: "หน้าหลัก", icon: House },
  {
    href: "/dashboard/donations",
    label: "ประวัติโดเนท",
    shortLabel: "ประวัติ",
    icon: ReceiptText,
    badge: true,
  },
  {
    href: "/dashboard/payment",
    label: "ช่องทางรับเงิน",
    shortLabel: "รับเงิน",
    icon: Wallet,
  },
  {
    href: "/dashboard/alert",
    label: "ตั้งค่า alert",
    shortLabel: "Alert",
    icon: Bell,
  },
  {
    href: "/dashboard/overlays",
    label: "Overlay",
    shortLabel: "Overlay",
    icon: Layers,
  },
  {
    href: "/dashboard/subathon",
    label: "Subathon",
    shortLabel: "Subathon",
    icon: Timer,
  },
  {
    href: "/dashboard/profile",
    label: "โปรไฟล์",
    shortLabel: "โปรไฟล์",
    icon: UserRound,
  },
];

const ADMIN_ITEM: NavItem = {
  href: "/dashboard/admin",
  label: "แอดมิน",
  shortLabel: "แอดมิน",
  icon: ShieldCheck,
};

function useNavItems(isAdmin: boolean) {
  return isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
}

/** จำนวนรอตรวจ (DonationWatcher ประกาศผ่าน window event) */
function usePendingCount() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const onCount = (e: Event) =>
      setPending((e as CustomEvent<PendingCountDetail>).detail.count);
    window.addEventListener(PENDING_COUNT_EVENT, onCount);
    return () => window.removeEventListener(PENDING_COUNT_EVENT, onCount);
  }, []);
  return pending;
}

function PendingBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      data-testid="pending-badge"
      className={cn(
        "absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] leading-none text-primary-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> รายการรอตรวจ</span>
    </span>
  );
}

const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname.startsWith(href);

/** คอม: แถบไอคอนแคบด้านซ้าย + tooltip */
export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const pending = usePendingCount();
  const items = useNavItems(isAdmin);

  return (
    <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = isActive(pathname, href);
        return (
          <Tooltip key={href}>
            <TooltipTrigger
              render={
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    active &&
                      "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                />
              }
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{label}</span>
              {badge && (
                <PendingBadge count={pending} className="-top-0.5 -right-0.5" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

/** มือถือ: แถบเมนูล่างจอแบบแอป (ไอคอน + ชื่อ) */
export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const pending = usePendingCount();
  const items = useNavItems(isAdmin);

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {items.map(({ href, label, shortLabel, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {badge && (
                    <PendingBadge
                      count={pending}
                      className="-top-1.5 -right-2.5"
                    />
                  )}
                </span>
                <span aria-hidden>{shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

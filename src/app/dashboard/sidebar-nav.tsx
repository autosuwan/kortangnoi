"use client";

import {
  Bell,
  House,
  ReceiptText,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

// เมนูที่ยังไม่ทำแสดงไว้แบบ "เร็วๆ นี้" — เปิดใช้ตอนทำ feature นั้น
const items: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: House },
  {
    href: "/dashboard/donations",
    label: "ประวัติโดเนท",
    icon: ReceiptText,
    soon: true,
  },
  {
    href: "/dashboard/payment",
    label: "ช่องทางรับเงิน",
    icon: Wallet,
    soon: true,
  },
  { href: "/dashboard/alert", label: "ตั้งค่า alert", icon: Bell, soon: true },
];

const itemClass =
  "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, soon }) => {
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

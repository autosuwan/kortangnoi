"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

/** ปุ่มเลือกแบบแบ่งช่อง — role "radio" (ค่าตั้ง) หรือ "tab" (ตัวกรอง/แท็บ) */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  role = "radio",
  className,
  fullWidth = false,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  role?: "radio" | "tab";
  className?: string;
  /** มือถือแบ่งช่องเท่ากันเต็มความกว้าง */
  fullWidth?: boolean;
}) {
  return (
    <div
      role={role === "radio" ? "radiogroup" : "tablist"}
      aria-label={label}
      className={cn(
        "flex max-w-full gap-0.5 overflow-x-auto rounded-lg border bg-card p-0.5 text-sm",
        fullWidth ? "w-full sm:w-fit" : "w-fit",
        className,
      )}
    >
      {options.map(({ value: v, label: text, icon: Icon, disabled }) => {
        const selected = v === value;
        return (
          <button
            key={v}
            type="button"
            role={role}
            aria-checked={role === "radio" ? selected : undefined}
            aria-selected={role === "tab" ? selected : undefined}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 whitespace-nowrap transition-colors disabled:opacity-50",
              fullWidth && "flex-1 sm:flex-none",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon && (
              <Icon
                className={cn("size-3.5", fullWidth && "hidden sm:block")}
                aria-hidden
              />
            )}
            {text}
          </button>
        );
      })}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * การ์ดมาตรฐานของ dashboard: ไอคอนในกล่องส้มอ่อน + หัวข้อ + คำอธิบาย + action ขวา
 * ขอบ 1px ไม่มีเงา มุม 16px (design brief)
 */
export function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  icon?: LucideIcon;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const hasHeader = Boolean(title || description || action);
  return (
    <section id={id} className={cn("rounded-2xl border bg-card", className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-medium">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children !== undefined && (
        <div
          className={cn("px-6 pt-4 pb-6", !hasHeader && "pt-6", bodyClassName)}
        >
          {children}
        </div>
      )}
    </section>
  );
}

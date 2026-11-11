import { Check } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const STEPS = ["กรอกข้อมูล", "สแกนจ่าย", "แนบสลิป"] as const;

/** การ์ดกลางจอของหน้าโดเนท: ชื่อสตรีมเมอร์ + ตัวบอกขั้นตอน 1-2-3 */
export function DonateShell({
  streamerName,
  step,
  children,
}: {
  streamerName: string;
  step: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <main className="app-bg flex flex-1 justify-center px-4 py-8 sm:items-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card">
          <header className="border-b px-6 pt-6 pb-5">
            <p className="text-xs text-muted-foreground">โดเนทให้</p>
            <h1
              data-testid="streamer-name"
              className="mt-0.5 truncate text-2xl font-medium"
            >
              {streamerName}
            </h1>
            <ol className="mt-4 flex items-center gap-2 text-xs">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const done = n < step;
                const active = n === step;
                return (
                  <li
                    key={label}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border font-mono text-[11px]",
                        active &&
                          "border-primary bg-primary text-primary-foreground",
                        done && "border-primary text-primary",
                      )}
                    >
                      {done ? <Check className="size-3" aria-hidden /> : n}
                    </span>
                    {label}
                    {n < STEPS.length && (
                      <span className="mx-0.5 h-px w-4 bg-border" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ol>
          </header>
          <div className="p-6">{children}</div>
        </div>
        <Link
          href="/"
          className="mx-auto mt-4 flex w-fit items-center gap-1.5 text-xs text-muted-foreground"
        >
          <LogoMark className="size-4 rounded" />
          KORTANGNOI · โอนตรงเข้าพร้อมเพย์ ไม่มีค่าธรรมเนียม
        </Link>
      </div>
    </main>
  );
}

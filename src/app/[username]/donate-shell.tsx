import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { ProfileCard, type StreamerProfile } from "@/components/profile-card";
import { cn } from "@/lib/utils";

const STEPS = ["กรอกข้อมูล", "สแกนจ่าย", "แนบสลิป"] as const;

/**
 * โครงหน้าโดเนท: คอมเป็น 2 คอลัมน์ (โปรไฟล์ติดหน้าจอซ้าย + การ์ดโดเนทขวา)
 * มือถือเรียงลง (โปรไฟล์ → การ์ดโดเนท)
 */
export function DonateShell({
  streamer,
  step,
  children,
}: {
  streamer: StreamerProfile | null;
  step: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div className="app-bg flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" aria-label="KORTANGNOI หน้าแรก">
          <Logo className="h-8" />
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
        >
          สร้างลิงก์โดเนทของคุณ
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-5 px-4 pb-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-6">
        {streamer && (
          <ProfileCard profile={streamer} className="lg:sticky lg:top-6" />
        )}

        <section className="rounded-2xl border bg-card">
          <div className="border-b px-5 py-4 sm:px-6">
            <p className="text-sm text-muted-foreground">
              {streamer ? (
                <>
                  โดเนทให้{" "}
                  <span className="font-medium text-foreground">
                    {streamer.displayName}
                  </span>
                </>
              ) : (
                "โดเนท"
              )}
            </p>
            <ol className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </section>
      </main>
    </div>
  );
}

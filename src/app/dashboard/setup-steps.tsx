"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  SETUP_STEPS,
  type SetupProgress,
  type SetupStep,
} from "@/lib/setup-steps";
import { cn } from "@/lib/utils";

/** แถบขั้นตอนด้านบนของแต่ละขั้น */
export function SetupSteps({
  current,
  done,
}: {
  current: SetupStep;
  /** ขั้นที่ทำเสร็จจริง (ไม่ใช่ตามลำดับ) */
  done: SetupProgress["done"];
}) {
  return (
    <nav
      aria-label="ขั้นตอนตั้งค่า"
      className="mb-6 rounded-2xl border border-primary/30 bg-card p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium">ตั้งค่าครั้งแรก</span>{" "}
          <span className="text-muted-foreground">
            ขั้นที่ {current} จาก {SETUP_STEPS.length}
          </span>
        </p>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ข้ามไว้ก่อน
        </Link>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {SETUP_STEPS.map((step, i) => {
          const n = i + 1;
          const isDone = done[i];
          const active = n === current;
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                aria-current={active ? "step" : undefined}
                className="flex flex-col items-center gap-1.5 text-center text-xs sm:flex-row sm:text-left sm:text-sm"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                    active &&
                      "border-primary bg-primary text-primary-foreground",
                    !active &&
                      isDone &&
                      "border-green-600 bg-green-600 text-white",
                    !active && !isDone && "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {isDone ? <Check className="size-4" /> : n}
                </span>
                <span
                  className={cn(
                    active ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                  {isDone && <span className="sr-only"> (เสร็จแล้ว)</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** แถบปุ่มล่างจอ: ย้อนกลับ + ไปขั้นต่อไป (แทนแถบ "ยังไม่บันทึก" ในโหมดตั้งค่า) */
export function SetupNextBar({
  current,
  nextLabel,
  busy,
  onNext,
}: {
  current: SetupStep;
  nextLabel: string;
  busy: boolean;
  onNext: () => void;
}) {
  const back = current > 1 ? SETUP_STEPS[current - 2] : null;
  return (
    <div
      role="region"
      aria-label="ไปขั้นต่อไป"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 md:bottom-4"
    >
      {back ? (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          ย้อนกลับ
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">
          ขั้นที่ {current}/{SETUP_STEPS.length}
        </span>
      )}
      <Button disabled={busy} onClick={onNext}>
        {busy && <Loader2 className="animate-spin" />}
        {nextLabel}
        {!busy && <ArrowRight />}
      </Button>
    </div>
  );
}

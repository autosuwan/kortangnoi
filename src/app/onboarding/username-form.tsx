"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkUsername } from "@/lib/username";

type Availability = "idle" | "checking" | "available" | "taken";

export function UsernameForm({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const check = checkUsername(value);
  const validUsername = check.ok ? check.username : null;
  const preview = check.ok
    ? check.username
    : value.trim().toLowerCase() || "ชื่อของคุณ";
  const host = siteUrl.replace(/^https?:\/\//, "");

  // เช็กว่าชื่อว่างไหมหลังหยุดพิมพ์ 400ms
  useEffect(() => {
    if (!validUsername) return;
    const username = validUsername;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAvailability("checking");
      try {
        const res = await fetch(
          `/api/usernames/check?u=${encodeURIComponent(username)}`,
          {
            signal: controller.signal,
          },
        );
        const body = await res.json();
        setAvailability(body.available ? "available" : "taken");
      } catch {
        if (!controller.signal.aborted) setAvailability("idle");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [validUsername]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!check.ok) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetch("/api/me/username", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: check.username }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error?.message ?? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      if (body?.error?.code === "USERNAME_TAKEN") setAvailability("taken");
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const fieldError =
    value && !check.ok
      ? check.message
      : availability === "taken"
        ? "ชื่อนี้มีคนใช้แล้ว"
        : null;

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="username">ชื่อผู้ใช้</Label>
        <div className="relative">
          <Input
            id="username"
            name="username"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setAvailability("idle");
              setSubmitError(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(fieldError)}
            aria-describedby="username-hint"
            className="pr-9"
          />
          <span className="absolute inset-y-0 right-3 flex items-center">
            {availability === "checking" && (
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-label="กำลังเช็ก"
              />
            )}
            {check.ok && availability === "available" && (
              <Check className="size-4 text-success" aria-label="ใช้ได้" />
            )}
            {fieldError && (
              <X className="size-4 text-destructive" aria-hidden />
            )}
          </span>
        </div>
        <p
          id="username-hint"
          className={
            fieldError
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {fieldError ?? "ใช้ได้ 3–20 ตัว เฉพาะ a–z, 0–9, _ และ -"}
        </p>
      </div>

      <div className="rounded-lg border bg-background px-3 py-2 font-mono text-sm break-all">
        <span className="text-muted-foreground">{host}/</span>
        <span className={check.ok ? "text-primary" : "text-muted-foreground"}>
          {preview}
        </span>
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!check.ok || availability === "taken" || submitting}
      >
        {submitting && <Loader2 className="animate-spin" />}
        บันทึกและไปต่อ
      </Button>
    </form>
  );
}

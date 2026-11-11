"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "discord";

const OAUTH_ERROR = "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? OAUTH_ERROR : null,
  );
  const [pending, setPending] = useState<Provider | "password" | null>(null);

  async function signInWith(provider: Provider) {
    setPending(provider);
    setError(null);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error) {
      // เช่น env ของ Supabase ไม่ได้ตั้งตอน build — อย่าให้ปุ่มหมุนค้าง
      console.error(error);
      setError(OAUTH_ERROR);
      setPending(null);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <Button
        variant="outline"
        size="lg"
        disabled={pending !== null}
        onClick={() => signInWith("google")}
      >
        {pending === "google" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        เข้าสู่ระบบด้วย Google
      </Button>
      <Button
        variant="outline"
        size="lg"
        disabled={pending !== null}
        onClick={() => signInWith("discord")}
      >
        {pending === "discord" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <DiscordIcon />
        )}
        เข้าสู่ระบบด้วย Discord
      </Button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        ใช้ช่องทางเดิมทุกครั้ง — Google กับ Discord นับเป็นคนละบัญชี
      </p>

      {publicEnv.passwordLoginEnabled && (
        <PasswordForm
          pending={pending}
          setPending={setPending}
          setError={setError}
        />
      )}
    </div>
  );
}

/** ใช้เฉพาะ dev และ e2e (บน cloud ปิด email provider) */
function PasswordForm({
  pending,
  setPending,
  setError,
}: {
  pending: string | null;
  setPending: (p: "password" | null) => void;
  setError: (e: string | null) => void;
}) {
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending("password");
    setError(null);

    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setPending(null);
      return;
    }

    const me = await fetch("/api/me").then((r) => r.json());
    router.replace(me.username ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex flex-col gap-3 border-t border-dashed pt-4"
    >
      <p className="font-mono text-xs text-muted-foreground">dev only</p>
      <div className="grid gap-1.5">
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" size="lg" disabled={pending !== null}>
        {pending === "password" && <Loader2 className="animate-spin" />}
        เข้าสู่ระบบด้วยรหัสผ่าน
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="#5865F2">
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.85a13.7 13.7 0 0 0-.63 1.3 18.4 18.4 0 0 0-5.53 0 13 13 0 0 0-.64-1.3 19.7 19.7 0 0 0-4.92 1.53C.56 9.04-.28 13.58.14 18.06a19.9 19.9 0 0 0 6.04 3.05c.49-.66.92-1.36 1.3-2.1a12.9 12.9 0 0 1-2.04-.98c.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.12 0l.5.4c-.65.39-1.33.71-2.05.98.38.74.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.04-3.05c.5-5.2-.84-9.7-3.53-13.69zM8.02 15.33c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.17 1.1 2.15 2.42 0 1.33-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.17 1.1 2.15 2.42 0 1.33-.94 2.42-2.15 2.42z" />
    </svg>
  );
}

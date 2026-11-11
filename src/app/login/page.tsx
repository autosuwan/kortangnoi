import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/logo";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · KORTANGNOI" };

export default function LoginPage() {
  return (
    <main className="app-bg flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8">
        <Link href="/" aria-label="KORTANGNOI หน้าแรก" className="inline-block">
          <Logo className="h-10" />
        </Link>
        <h1 className="mt-8 text-2xl font-medium">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สำหรับสตรีมเมอร์ ผู้บริจาคไม่ต้องสมัคร
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { startNavigationProgress } from "@/lib/navigation-progress";

import { SetupNextBar } from "../../setup-steps";

export function FinishBar() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <SetupNextBar
      current={3}
      busy={busy}
      nextLabel="เสร็จแล้ว ไปหน้าหลัก"
      onNext={async () => {
        setBusy(true);
        // บันทึกไม่ได้ก็ไปหน้าหลักต่อ การ์ดเริ่มต้นใช้งานแค่ยังแสดงอยู่
        await fetch("/api/me/setup-done", { method: "POST" }).catch(() => null);
        startNavigationProgress();
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}

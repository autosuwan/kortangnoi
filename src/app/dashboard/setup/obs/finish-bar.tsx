"use client";

import { useRouter } from "next/navigation";

import { startNavigationProgress } from "@/lib/navigation-progress";

import { SetupNextBar } from "../../setup-steps";

export function FinishBar() {
  const router = useRouter();
  return (
    <SetupNextBar
      current={3}
      busy={false}
      nextLabel="เสร็จแล้ว ไปหน้าหลัก"
      onNext={() => {
        startNavigationProgress();
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** ซ่อนการ์ดเริ่มต้นใช้งานบนหน้าหลัก (ตั้งค่าต่อได้จากเมนูแต่ละหน้า) */
export function HideSetupButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/me/setup-done", { method: "POST" }).catch(
          () => null,
        );
        if (res?.ok) router.refresh();
        else setBusy(false);
      }}
    >
      {busy && <Loader2 className="animate-spin" />}
      ซ่อน
    </Button>
  );
}

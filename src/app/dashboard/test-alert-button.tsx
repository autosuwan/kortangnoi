"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return (body?.error?.message as string | undefined) ?? fallback;
}

/** ส่ง alert ตัวอย่างไป overlay จริงใน OBS (ใช้ค่าที่บันทึกแล้ว) */
export function TestAlertButton({
  hint = "ใช้ค่าที่บันทึกแล้ว · ใส่ลิงก์ OBS จากหน้าหลักก่อน",
  className,
  refreshOnSent = false,
}: {
  hint?: string;
  className?: string;
  /** ส่งแล้วโหลดข้อมูลหน้าใหม่ (ติ๊กขั้นตั้งค่า) */
  refreshOnSent?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/alerts/test", { method: "POST" });
      if (!res.ok) {
        setMessage(await readError(res, "ส่งไม่สำเร็จ"));
        setState("idle");
        return;
      }
      setState("sent");
      if (refreshOnSent) router.refresh();
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setMessage("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      setState("idle");
    }
  }

  return (
    <div
      className={cn("mt-3 flex flex-wrap items-center gap-2 px-2", className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={state === "sending"}
        onClick={send}
      >
        {state === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
        ทดสอบ alert ใน OBS
      </Button>
      <span
        role="status"
        className={cn(
          "text-xs",
          message ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {message ?? (state === "sent" ? "ส่งแล้ว ดูที่ OBS ได้เลย" : hint)}
      </span>
    </div>
  );
}

"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "คัดลอก",
  ariaLabel,
}: {
  text: string;
  label?: string;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      aria-label={ariaLabel}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // คัดลอกไม่ได้ (เช่น ไม่อนุญาต clipboard) — ผู้ใช้ยังเลือกข้อความเองได้
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "คัดลอกแล้ว" : label}
    </Button>
  );
}

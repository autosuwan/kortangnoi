"use client";

import { QrCode } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { SectionCard } from "@/components/dashboard/section-card";
import {
  buildPromptpayPayload,
  isValidPromptpayId,
  normalizePromptpayId,
  type PromptpayType,
} from "@/lib/promptpay";

/**
 * พรีวิว QR พร้อมเพย์แบบสดจากค่าที่กำลังพิมพ์ (ยังไม่ต้องบันทึก)
 * QR ไม่ล็อกยอด — สแกนในแอปธนาคารเห็นชื่อผู้รับ ใช้เช็กว่าเลขถูกโดยไม่ต้องโอน
 */
export function QrPreviewCard({
  promptpayType,
  promptpayId,
  recipientName,
  showsAccountName,
}: {
  promptpayType: PromptpayType;
  promptpayId: string;
  recipientName: string;
  showsAccountName: boolean;
}) {
  const id = normalizePromptpayId(promptpayId);
  const valid = isValidPromptpayId(promptpayType, id);
  const key = `${promptpayType}:${id}`;
  const [qr, setQr] = useState<{ key: string; src: string } | null>(null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    QRCode.toDataURL(buildPromptpayPayload({ type: promptpayType, id }), {
      margin: 1,
      width: 480,
    }).then((src) => {
      if (!cancelled) setQr({ key, src });
    });
    return () => {
      cancelled = true;
    };
  }, [valid, promptpayType, id, key]);

  return (
    <SectionCard
      icon={QrCode}
      title="พรีวิว QR พร้อมเพย์"
      description="อัปเดตทันทีที่พิมพ์"
      className="lg:sticky lg:top-20"
      bodyClassName="flex flex-col items-center text-center"
    >
      <div className="flex items-center gap-2">
        <Image
          src="/brands/thai-qr.png"
          alt="Thai QR Payment"
          width={243}
          height={96}
          className="h-6 w-auto"
        />
        <Image
          src="/brands/promptpay.png"
          alt="พร้อมเพย์"
          width={286}
          height={96}
          className="h-6 w-auto"
        />
      </div>

      <div className="mt-5 flex size-56 items-center justify-center rounded-xl border bg-white p-2">
        {valid && qr?.key === key ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL ที่สร้างฝั่ง client
          <img
            src={qr.src}
            alt="QR พร้อมเพย์ตัวอย่าง"
            data-testid="qr-preview"
            className="size-full"
          />
        ) : valid ? (
          <div className="size-full animate-pulse rounded-lg bg-muted" />
        ) : (
          <div
            data-testid="qr-placeholder"
            className="flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground"
          >
            <QrCode className="size-10 opacity-40" aria-hidden />
            กรอกเลขพร้อมเพย์ให้ถูกต้อง QR จะขึ้นที่นี่
          </div>
        )}
      </div>

      <p className="mt-4 text-sm">
        <span className="text-muted-foreground">
          {showsAccountName ? "ชื่อบัญชีที่ผู้โดเนทเห็น" : "ผู้โดเนทเห็นชื่อ"}
        </span>
        <span
          data-testid="qr-recipient"
          className="mt-0.5 block text-base font-medium"
        >
          {recipientName || "–"}
        </span>
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        ทดลองสแกน QR Code ด้วยแอปธนาคารเพื่อตรวจสอบว่าชื่อผู้รับถูกต้อง (ไม่ต้องกดโอน)
      </p>
    </SectionCard>
  );
}

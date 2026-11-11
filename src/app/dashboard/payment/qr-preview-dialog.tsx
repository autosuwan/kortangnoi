"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildPromptpayPayload,
  isValidPromptpayId,
  normalizePromptpayId,
  type PromptpayType,
} from "@/lib/promptpay";

/** QR 1 บาทจากค่าที่กรอกอยู่ (ยังไม่บันทึกก็ได้) ไว้สแกนเช็กชื่อผู้รับในแอปธนาคาร */
export function QrPreviewDialog({
  open,
  onOpenChange,
  promptpayType,
  promptpayId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptpayType: PromptpayType;
  promptpayId: string;
}) {
  const id = normalizePromptpayId(promptpayId);
  const valid = isValidPromptpayId(promptpayType, id);
  const [qr, setQr] = useState<{ key: string; src: string } | null>(null);
  const key = `${promptpayType}:${id}`;

  useEffect(() => {
    if (!open || !valid) return;
    let cancelled = false;
    const payload = buildPromptpayPayload({
      type: promptpayType,
      id,
      amountSatang: 100,
    });
    QRCode.toDataURL(payload, { margin: 1, width: 480 }).then((src) => {
      if (!cancelled) setQr({ key, src });
    });
    return () => {
      cancelled = true;
    };
  }, [open, valid, promptpayType, id, key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ตัวอย่าง QR 1 บาท</DialogTitle>
          <DialogDescription>
            สแกนด้วยแอปธนาคาร แล้วดูว่าชื่อผู้รับเป็นของคุณ — ไม่ต้องกดโอน
          </DialogDescription>
        </DialogHeader>
        {!valid ? (
          <p role="alert" className="text-sm text-destructive">
            กรอก
            {promptpayType === "phone" ? "เบอร์พร้อมเพย์" : "เลขบัตรประชาชน"}
            ให้ถูกต้องก่อน
          </p>
        ) : qr?.key === key ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL ที่สร้างฝั่ง client
          <img
            src={qr.src}
            alt="QR พร้อมเพย์ตัวอย่าง 1 บาท"
            data-testid="qr-preview"
            className="mx-auto size-60 rounded-lg border bg-white p-2"
          />
        ) : (
          <div className="mx-auto size-60 animate-pulse rounded-lg border bg-muted" />
        )}
      </DialogContent>
    </Dialog>
  );
}

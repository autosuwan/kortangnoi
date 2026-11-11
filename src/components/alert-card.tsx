"use client";

import { useState } from "react";

import { DEFAULT_ALERT_IMAGE } from "@/lib/alert-settings";
import { formatSatangNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

export type AlertCardProps = {
  imageUrl: string;
  donorName: string;
  supportText: string;
  amountSatang: number;
  message: string | null;
  nameColor: string;
  className?: string;
};

const AMOUNT_COLOR = "#F97316";

/**
 * alert ที่เด้งบน OBS — ไม่มีการ์ดพื้นหลัง รูปอยู่บน ตามด้วย
 * "<ชื่อ> <คำสนับสนุน> <ยอด> บาท" และข้อความของผู้บริจาค (design brief)
 * ใช้ทั้งพรีวิวใน dashboard และ overlay; ข้อความทั้งหมดเป็น text — React escape ให้
 */
export function AlertCard({
  imageUrl,
  donorName,
  supportText,
  amountSatang,
  message,
  nameColor,
  className,
}: AlertCardProps) {
  // รูปภายนอกถูกลบ/โหลดไม่ได้ → ใช้รูปเริ่มต้น (จำว่า URL ไหนพัง เผื่อเปลี่ยนรูปทีหลัง)
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const src = brokenUrl === imageUrl ? DEFAULT_ALERT_IMAGE : imageUrl;

  return (
    <div
      data-testid="alert"
      className={cn(
        "flex w-full max-w-[560px] flex-col items-center text-center text-white",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage/GIF ภายนอก ขนาดไม่แน่นอน */}
      <img
        src={src}
        alt=""
        data-testid="alert-image"
        className="h-44 max-w-full object-contain drop-shadow-[0_4px_12px_rgb(0_0_0/0.4)]"
        onError={() => setBrokenUrl(imageUrl)}
      />
      <p
        data-testid="alert-headline"
        className="mt-3 text-[28px] leading-snug font-bold break-words alert-text"
      >
        <span data-testid="alert-name" style={{ color: nameColor }}>
          {donorName}
        </span>{" "}
        {supportText}{" "}
        <span style={{ color: AMOUNT_COLOR }}>
          {formatSatangNumber(amountSatang)}
        </span>{" "}
        บาท
      </p>
      {message && (
        <p className="mt-1 line-clamp-3 text-xl leading-snug font-semibold break-words whitespace-pre-line alert-text">
          {message}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

import { DEFAULT_ALERT_IMAGE } from "@/lib/alert-settings";
import { formatSatang } from "@/lib/money";
import { cn } from "@/lib/utils";

export type AlertCardProps = {
  imageUrl: string;
  donorName: string;
  amountSatang: number;
  message: string | null;
  className?: string;
};

/**
 * การ์ด alert ที่เด้งใน OBS (design brief: การ์ดขาว ขอบ 1px มุม 16px, รูปบนสุด,
 * ชื่อ + ยอดสีส้มตัวใหญ่, ข้อความตัดที่ 3 บรรทัด) ใช้ทั้งพรีวิวใน dashboard และ overlay
 * ข้อความแสดงเป็น text เท่านั้น — React escape ให้ ห้ามใช้ dangerouslySetInnerHTML
 */
export function AlertCard({
  imageUrl,
  donorName,
  amountSatang,
  message,
  className,
}: AlertCardProps) {
  // รูปภายนอกถูกลบ/โหลดไม่ได้ → ใช้รูปเริ่มต้น (จำว่า URL ไหนพัง เผื่อเปลี่ยนรูปทีหลัง)
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const src = brokenUrl === imageUrl ? DEFAULT_ALERT_IMAGE : imageUrl;

  return (
    <div
      className={cn(
        "flex w-full max-w-[360px] flex-col items-center rounded-2xl border bg-white px-6 pt-6 pb-5 text-center text-neutral-900",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage/GIF ภายนอก ขนาดไม่แน่นอน */}
      <img
        src={src}
        alt=""
        data-testid="alert-image"
        className="h-40 max-w-full object-contain"
        onError={() => setBrokenUrl(imageUrl)}
      />
      <p className="mt-4 text-lg leading-snug font-medium break-words">
        {donorName}
      </p>
      <p className="mt-1 font-mono text-4xl font-semibold text-[#F97316]">
        {formatSatang(amountSatang)}
      </p>
      {message && (
        <p className="mt-3 line-clamp-3 text-sm break-words whitespace-pre-line text-neutral-600">
          {message}
        </p>
      )}
    </div>
  );
}

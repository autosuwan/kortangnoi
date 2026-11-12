"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * พรีวิวขนาดจริงของ Browser Source (เช่น 800×160) แล้วย่อให้พอดีกล่อง
 * หน้าตาจึงตรงกับที่ขึ้นใน OBS ไม่ใช่แค่ใกล้เคียง
 */
export function ScaledPreview({
  width,
  height,
  maxHeight = 280,
  className,
  children,
  testId,
}: {
  width: number;
  height: number;
  /** กล่องสูงไม่เกินนี้ (px) — widget แนวตั้งจะแคบลงแทน */
  maxHeight?: number;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div
      ref={box}
      data-testid={testId}
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-xl border bg-obs-checker",
        className,
      )}
      style={{
        aspectRatio: `${width} / ${height}`,
        maxWidth: (maxHeight * width) / height,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

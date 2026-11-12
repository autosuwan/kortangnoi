"use client";

import { Trophy } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { formatSatangNumber } from "@/lib/money";
import {
  goalPercent,
  TOP_PERIOD_LABELS,
  type GoalData,
  type QrData,
  type RecentData,
  type TopData,
} from "@/lib/overlay-widgets";
import { cn } from "@/lib/utils";

const AMOUNT = "#F97316";

/** หลอดเป้าหมายโดเนท */
export function GoalWidget({
  data,
  className,
}: {
  data: GoalData;
  className?: string;
}) {
  const pct = goalPercent(data.currentSatang, data.targetSatang);
  const done = data.currentSatang >= data.targetSatang;
  return (
    <div
      data-testid="goal-widget"
      data-percent={pct}
      className={cn("w-full max-w-3xl text-white", className)}
    >
      <div className="flex items-end justify-between gap-4 text-2xl font-semibold alert-text">
        <span className="min-w-0 truncate">{data.title}</span>
        <span className="shrink-0 font-mono text-xl" data-testid="goal-amount">
          <span style={{ color: AMOUNT }}>
            {formatSatangNumber(data.currentSatang)}
          </span>{" "}
          / {formatSatangNumber(data.targetSatang)} บาท
        </span>
      </div>
      <div className="relative mt-2 h-8 overflow-hidden rounded-full border-2 border-black bg-black/50 shadow-lg">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-1000 ease-out",
            done && "animate-pulse",
          )}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center font-mono text-base font-semibold alert-text">
          {done ? "ครบเป้าแล้ว! 🎉" : `${pct}%`}
        </span>
      </div>
    </div>
  );
}

/** การ์ด QR ลิงก์หน้าโดเนท */
export function QrWidget({
  data,
  className,
}: {
  data: QrData;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(data.donateUrl, { margin: 1, width: 480 }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [data.donateUrl]);

  return (
    <figure
      data-testid="qr-widget"
      data-url={data.donateUrl}
      className={cn(
        "flex w-64 flex-col items-center gap-2 rounded-2xl border-4 border-orange-500 bg-white p-4 text-center text-neutral-900 shadow-xl",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL
        <img
          src={src}
          alt={`QR ไปหน้าโดเนท ${data.donateUrl}`}
          className="size-52"
        />
      ) : (
        <div className="size-52" />
      )}
      <figcaption>
        <p className="text-lg font-semibold">{data.caption}</p>
        <p className="font-mono text-xs break-all text-neutral-500">
          {data.donateUrl.replace(/^https?:\/\//, "")}
        </p>
      </figcaption>
    </figure>
  );
}

/** อันดับผู้สนับสนุน */
export function TopWidget({
  data,
  className,
}: {
  data: TopData;
  className?: string;
}) {
  return (
    <section
      data-testid="top-widget"
      className={cn("w-full max-w-sm text-white", className)}
    >
      <h2 className="flex items-center gap-2 text-2xl font-semibold alert-text">
        <Trophy className="size-6 text-amber-400" aria-hidden />
        Top ผู้สนับสนุน
        <span className="text-base font-normal">
          ({TOP_PERIOD_LABELS[data.period]})
        </span>
      </h2>
      {data.items.length === 0 ? (
        <p className="mt-2 text-lg alert-text">ยังไม่มีโดเนท</p>
      ) : (
        <ol className="mt-2 grid gap-1.5">
          {data.items.map((item, i) => (
            <li
              key={item.name}
              className="flex items-baseline gap-3 text-xl font-semibold alert-text"
            >
              <span
                className={cn(
                  "w-7 shrink-0 text-right font-mono",
                  i === 0 && "text-amber-400",
                  i === 1 && "text-neutral-200",
                  i === 2 && "text-orange-300",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="shrink-0 font-mono" style={{ color: AMOUNT }}>
                {formatSatangNumber(item.totalSatang)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** แถบโดเนทล่าสุดแบบตัวหนังสือวิ่ง */
export function RecentWidget({
  data,
  className,
}: {
  data: RecentData;
  className?: string;
}) {
  const items = data.items;
  const content = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-8 pr-8"
    >
      {items.map((d) => (
        <li key={d.id} className="flex items-baseline gap-2 whitespace-nowrap">
          <span>{d.name}</span>
          <span className="font-mono" style={{ color: AMOUNT }}>
            {formatSatangNumber(d.amountSatang)} บาท
          </span>
          <span className="text-orange-400" aria-hidden>
            ●
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      data-testid="recent-widget"
      className={cn(
        "w-full overflow-hidden rounded-full bg-black/40 py-2 text-xl font-semibold text-white alert-text",
        className,
      )}
    >
      {items.length === 0 ? (
        <p className="px-6">ยังไม่มีโดเนท</p>
      ) : (
        <div
          className="flex w-max animate-marquee"
          // ยิ่งรายการมากยิ่งช้า ให้ความเร็วอ่านได้พอๆ กัน
          style={
            {
              "--marquee-duration": `${Math.max(12, items.length * 5)}s`,
            } as React.CSSProperties
          }
        >
          {content(false)}
          {content(true)}
        </div>
      )}
    </div>
  );
}

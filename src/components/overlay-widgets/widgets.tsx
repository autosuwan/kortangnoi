"use client";

import { Trophy } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { formatSatangNumber } from "@/lib/money";
import {
  BAR_HEIGHT,
  goalPercent,
  QR_SIZE,
  SPEED_SECONDS,
  TEXT_SCALE,
  TOP_PERIOD_LABELS,
  type GoalData,
  type QrData,
  type RecentData,
  type TopData,
  type WidgetKind,
} from "@/lib/overlay-widgets";
import { cn } from "@/lib/utils";

/** ขนาดตัวอักษรฐานของ widget (ข้างในใช้หน่วย em จึงขยายตามทั้งชุด) */
const baseFont = (size: keyof typeof TEXT_SCALE) =>
  `${16 * TEXT_SCALE[size]}px`;

/** หลอดเป้าหมายโดเนท */
export function GoalWidget({
  data,
  className,
}: {
  data: GoalData;
  className?: string;
}) {
  const s = data.style;
  const pct = goalPercent(data.currentSatang, data.targetSatang);
  const done = data.currentSatang >= data.targetSatang;
  const bar = BAR_HEIGHT[s.barHeight];
  // หลอดบางเกินจะใส่ % ในหลอดไม่ได้ → ย้ายไปไว้บรรทัดหัว
  const percentInside = s.showPercent && bar >= 24;
  const percentText = done ? "ครบเป้าแล้ว! 🎉" : `${pct}%`;

  return (
    <div
      data-testid="goal-widget"
      data-percent={pct}
      className={cn("max-w-full", className)}
      style={{
        width: s.width,
        fontSize: baseFont(s.textSize),
        color: s.textColor,
      }}
    >
      <div className="flex items-end justify-between gap-4 font-semibold alert-text">
        <span className="min-w-0 truncate text-[1.5em]">{data.title}</span>
        {(s.showAmount || (s.showPercent && !percentInside)) && (
          <span
            className="shrink-0 font-mono text-[1.25em]"
            data-testid="goal-amount"
          >
            {s.showAmount && (
              <>
                <span style={{ color: s.amountColor }}>
                  {formatSatangNumber(data.currentSatang)}
                </span>{" "}
                / {formatSatangNumber(data.targetSatang)} บาท
              </>
            )}
            {s.showPercent && !percentInside && (
              <span className="ml-2">{percentText}</span>
            )}
          </span>
        )}
      </div>
      <div
        data-testid="goal-track"
        className="relative mt-[0.4em] overflow-hidden rounded-full border-2 border-black shadow-lg"
        style={{ height: bar, backgroundColor: `${s.trackColor}B3` }}
      >
        <div
          data-testid="goal-bar"
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-out",
            done && "animate-pulse",
          )}
          style={{
            width: `${pct}%`,
            backgroundImage: `linear-gradient(to right, ${s.barFrom}, ${s.barTo})`,
          }}
        />
        {percentInside && (
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[1em] font-semibold alert-text">
            {percentText}
          </span>
        )}
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
  const s = data.style;
  const img = QR_SIZE[s.size];
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(data.donateUrl, { margin: 1, width: 512 }).then((url) => {
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
        "flex flex-col items-center gap-[0.5em] rounded-2xl border-4 bg-white p-[1em] text-center shadow-xl",
        className,
      )}
      style={{
        borderColor: s.borderColor,
        fontSize: baseFont(s.textSize),
        color: s.textColor,
        width: img + 48,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL
        <img
          src={src}
          alt={`QR ไปหน้าโดเนท ${data.donateUrl}`}
          style={{ width: img, height: img }}
        />
      ) : (
        <div style={{ width: img, height: img }} />
      )}
      <figcaption className="w-full">
        <p className="text-[1.125em] font-semibold">{data.caption}</p>
        <p className="font-mono text-[0.75em] break-all opacity-60">
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
  const s = data.style;
  return (
    <section
      data-testid="top-widget"
      className={cn("w-[25em] max-w-full", className)}
      style={{ fontSize: baseFont(s.textSize), color: s.textColor }}
    >
      <h2 className="flex items-center gap-[0.4em] text-[1.5em] font-semibold alert-text">
        <Trophy className="size-[1em] text-amber-400" aria-hidden />
        <span className="min-w-0 truncate">{s.title}</span>
        <span className="shrink-0 text-[0.65em] font-normal">
          ({TOP_PERIOD_LABELS[data.period]})
        </span>
      </h2>
      {data.items.length === 0 ? (
        <p className="mt-[0.5em] text-[1.125em] alert-text">ยังไม่มีโดเนท</p>
      ) : (
        <ol className="mt-[0.5em] grid gap-[0.3em]">
          {data.items.map((item, i) => (
            <li
              key={item.name}
              className="flex items-baseline gap-[0.6em] text-[1.25em] font-semibold alert-text"
            >
              <span
                className={cn(
                  "w-[1.4em] shrink-0 text-right font-mono",
                  i === 0 && "text-amber-400",
                  i === 1 && "text-neutral-200",
                  i === 2 && "text-orange-300",
                )}
              >
                {i + 1}
              </span>
              <span
                className="min-w-0 flex-1 truncate"
                style={{ color: s.nameColor }}
              >
                {item.name}
              </span>
              <span
                className="shrink-0 font-mono"
                style={{ color: s.amountColor }}
              >
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
  const s = data.style;
  const items = data.items;
  const content = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-[1.6em] pr-[1.6em]"
    >
      {items.map((d) => (
        <li
          key={d.id}
          className="flex items-baseline gap-[0.4em] whitespace-nowrap"
        >
          <span>{d.name}</span>
          <span className="font-mono" style={{ color: s.amountColor }}>
            {formatSatangNumber(d.amountSatang)} บาท
          </span>
          <span style={{ color: s.amountColor }} aria-hidden>
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
        "w-full overflow-hidden rounded-full py-[0.4em] font-semibold alert-text",
        className,
      )}
      style={{
        fontSize: `${20 * TEXT_SCALE[s.textSize]}px`,
        color: s.textColor,
        backgroundColor: s.showBackground
          ? `${s.backgroundColor}66`
          : undefined,
      }}
    >
      {items.length === 0 ? (
        <p className="px-[1.2em]">ยังไม่มีโดเนท</p>
      ) : (
        <div
          className="flex w-max animate-marquee"
          style={
            {
              "--marquee-duration": `${Math.max(10, items.length * SPEED_SECONDS[s.speed])}s`,
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

/** วาง widget ในกรอบ Browser Source แบบเดียวกันทั้งใน OBS และพรีวิว */
export function WidgetStage({
  kind,
  className,
  children,
}: {
  kind: WidgetKind;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex p-4",
        kind === "top"
          ? "items-start justify-start"
          : "items-center justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

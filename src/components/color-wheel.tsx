"use client";

import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { hexToHsv, hsvToHex, pointToHueSat, type Hsv } from "@/lib/color";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#FACC15",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#38BDF8",
  "#22C55E",
  "#FFFFFF",
];

const SIZE = 168;

/**
 * วงล้อสี: มุม = hue (แดงอยู่บน หมุนตามเข็ม), ระยะจากกลาง = saturation,
 * แถบด้านล่าง = ความสว่าง; ลาก/แตะบนวงล้อ, ใช้ลูกศรบนคีย์บอร์ด, พิมพ์ hex หรือกดสีด่วนได้
 */
export function ColorWheel({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  // เก็บ hsv เองด้วย เพราะสีขาว/ดำแปลงกลับจาก hex แล้ว hue หาย — วงล้อจะไม่กระโดด
  const [hsv, setHsv] = useState<Hsv>(
    () => hexToHsv(value) ?? { h: 0, s: 1, v: 1 },
  );
  const [lastValue, setLastValue] = useState(value);
  const [hexText, setHexText] = useState(value);
  const wheel = useRef<HTMLDivElement>(null);

  // ค่าเปลี่ยนจากข้างนอก (เช่น กดยกเลิก) → sync
  if (value !== lastValue) {
    setLastValue(value);
    setHexText(value);
    if (value !== hsvToHex(hsv)) setHsv(hexToHsv(value) ?? hsv);
  }

  function commit(next: Hsv) {
    const hex = hsvToHex(next);
    setHsv(next);
    setLastValue(hex);
    setHexText(hex);
    onChange(hex);
  }

  function pick(clientX: number, clientY: number) {
    const rect = wheel.current?.getBoundingClientRect();
    if (!rect) return;
    const { h, s } = pointToHueSat(
      clientX - (rect.left + rect.width / 2),
      clientY - (rect.top + rect.height / 2),
      rect.width / 2,
    );
    commit({ h, s, v: hsv.v || 1 });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 15 : 5;
    const moves: Record<string, Partial<Hsv>> = {
      ArrowRight: { h: (hsv.h + step) % 360 },
      ArrowLeft: { h: (hsv.h - step + 360) % 360 },
      ArrowUp: { s: Math.min(1, hsv.s + 0.05) },
      ArrowDown: { s: Math.max(0, hsv.s - 0.05) },
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    commit({ ...hsv, ...move });
  }

  const radius = SIZE / 2;
  const rad = (hsv.h * Math.PI) / 180;
  const marker = {
    left: radius + Math.sin(rad) * hsv.s * radius,
    top: radius - Math.cos(rad) * hsv.s * radius,
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div
        ref={wheel}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuetext={value}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuemin={0}
        aria-valuemax={359}
        data-testid="color-wheel"
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            pick(e.clientX, e.clientY);
          }
        }}
        className="relative shrink-0 cursor-crosshair touch-none rounded-full border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{
          width: SIZE,
          height: SIZE,
          background:
            "radial-gradient(closest-side, #fff, rgb(255 255 255 / 0)), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        {/* ความสว่าง: ทับด้วยสีดำตามค่า v */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-black"
          style={{ opacity: 1 - hsv.v }}
        />
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.4)]"
          style={{ ...marker, backgroundColor: value }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-sm text-muted-foreground">
            ความสว่าง
          </span>
          <Slider
            thumbLabel="ความสว่าง"
            min={10}
            max={100}
            value={[Math.round(hsv.v * 100)]}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? v[0] : (v as number);
              commit({ ...hsv, v: n / 100 });
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <span
            className="size-8 shrink-0 rounded-lg border"
            style={{ backgroundColor: value }}
          />
          <Input
            aria-label="รหัสสี"
            className="w-28 font-mono uppercase"
            maxLength={7}
            value={hexText}
            onChange={(e) => {
              const text = e.target.value.startsWith("#")
                ? e.target.value
                : `#${e.target.value}`;
              setHexText(text);
              const next = hexToHsv(text);
              if (next) {
                const hex = text.toUpperCase();
                setHsv(next);
                setLastValue(hex);
                onChange(hex);
              }
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="สีด่วน" role="group">
          {PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`สี ${hex}`}
              aria-pressed={value === hex}
              onClick={() => commit(hexToHsv(hex)!)}
              className={cn(
                "size-7 rounded-full border shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform hover:scale-110",
                value === hex && "ring-2 ring-primary ring-offset-2",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

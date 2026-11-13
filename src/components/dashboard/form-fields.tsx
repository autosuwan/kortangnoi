"use client";

import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commitIntegerText, sanitizeIntegerText } from "@/lib/integer-input";
import { TIMER_INITIAL_SEC, WIDGET_TEXT_MAX } from "@/lib/overlay-widgets";

export function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">
          {value.length}/{WIDGET_TEXT_MAX}
        </span>
      </div>
      <Input
        id={id}
        placeholder={placeholder}
        maxLength={WIDGET_TEXT_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * ช่องจำนวนเต็ม: เก็บข้อความที่พิมพ์เอง (ลบจนว่างแล้วพิมพ์ใหม่ได้ ไม่มี 0 แทรก)
 * ส่งค่าออกทุกครั้งที่พิมพ์ (ไม่เกิน max) และปัดเข้าช่วง min–max ตอนออกจากช่อง
 */
export function IntegerInput({
  value,
  min,
  max,
  onChange,
  onBlur,
  ...props
}: Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "min" | "max"
> & {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  // ระหว่างโฟกัสแสดงข้อความที่พิมพ์ ไม่โฟกัสแสดงค่าจริง (ปุ่ม −/+ เปลี่ยนแล้วตามทัน)
  const [text, setText] = useState<string | null>(null);
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={text ?? String(value)}
      onFocus={(e) => {
        setText(String(value));
        props.onFocus?.(e);
      }}
      onChange={(e) => {
        const t = sanitizeIntegerText(e.target.value);
        setText(t);
        if (t !== "") onChange(Math.min(max, Number(t)));
      }}
      onBlur={(e) => {
        const n = commitIntegerText(text ?? String(value), min, max);
        setText(null);
        if (n !== value) onChange(n);
        onBlur?.(e);
      }}
    />
  );
}

export function NumberInput({
  ariaLabel,
  value,
  min,
  max,
  onChange,
}: {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <IntegerInput
      aria-label={ariaLabel}
      className="h-9 w-24 text-center font-mono"
      value={value}
      min={min}
      max={max}
      onChange={onChange}
    />
  );
}

/** เวลาแบบ ชั่วโมง + นาที */
export function DurationField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (sec: number) => void;
}) {
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const clamp = (sec: number) =>
    Math.min(TIMER_INITIAL_SEC.max, Math.max(TIMER_INITIAL_SEC.min, sec));
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2 text-sm">
        <NumberInput
          ariaLabel={`${label} (ชั่วโมง)`}
          value={h}
          min={0}
          max={24}
          onChange={(v) => onChange(clamp(v * 3600 + m * 60))}
        />
        ชั่วโมง
        <NumberInput
          ariaLabel={`${label} (นาที)`}
          value={m}
          min={0}
          max={59}
          onChange={(v) => onChange(clamp(h * 3600 + Math.min(59, v) * 60))}
        />
        นาที
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

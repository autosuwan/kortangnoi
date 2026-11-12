"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#FFFFFF",
  "#171717",
  "#FACC15",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#3B82F6",
  "#22C55E",
];

const HEX = /^#?[0-9a-fA-F]{6}$/;

/**
 * เลือกสีแบบกะทัดรัด: ช่องสี (เปิดตัวเลือกสีของเครื่อง) + พิมพ์ hex + สีด่วน
 * ค่าเป็น "#RRGGBB" ตัวพิมพ์ใหญ่เสมอ
 */
export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  // พิมพ์ค้างไว้ได้ระหว่างยังไม่ครบ 6 หลัก
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => {
    if (HEX.test(raw)) onChange(`#${raw.replace("#", "").toUpperCase()}`);
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span
          className="relative size-9 shrink-0 overflow-hidden rounded-lg border shadow-xs"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            aria-label={`${label} (ตัวเลือกสี)`}
            value={value.toLowerCase()}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <Input
          id={id}
          value={text ?? value}
          maxLength={7}
          spellCheck={false}
          className="h-9 w-28 font-mono uppercase"
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(null)}
        />
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`สีด่วน ${label}`}
      >
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={cn(
              "flex size-6 items-center justify-center rounded-full border shadow-xs transition-transform hover:scale-110",
              value === c && "ring-2 ring-primary ring-offset-1",
            )}
            style={{ backgroundColor: c }}
          >
            {value === c && (
              <Check
                className={cn(
                  "size-3.5",
                  c === "#FFFFFF" || c === "#FACC15"
                    ? "text-neutral-900"
                    : "text-white",
                )}
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

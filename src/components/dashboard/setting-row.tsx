"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** แถวตั้งค่าแบบสวิตช์: ป้ายชื่อ + คำอธิบาย + สวิตช์ */
export function SettingRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  id: string;
  label: string;
  /** ชื่อสวิตช์สำหรับ screen reader ถ้าต่างจาก label */
  ariaLabel?: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        {/* มี ariaLabel แยก = ป้ายนี้ซ้ำกับช่องอื่นในหน้า ไม่ผูกกับสวิตช์ */}
        {ariaLabel ? (
          <p className="text-sm font-medium">{label}</p>
        ) : (
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
        )}
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        id={id}
        aria-label={ariaLabel ?? label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

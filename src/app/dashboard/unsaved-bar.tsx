"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** แถบ "ยังไม่บันทึก" ติดล่างจอของหน้าตั้งค่า แสดงเมื่อมีการแก้ */
export function UnsavedBar({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="การแก้ไขที่ยังไม่บันทึก"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 md:bottom-4"
    >
      <span className="text-sm">ยังไม่บันทึก</span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={saving} onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button disabled={saving} onClick={onSave}>
          {saving && <Loader2 className="animate-spin" />}
          บันทึก
        </Button>
      </div>
    </div>
  );
}

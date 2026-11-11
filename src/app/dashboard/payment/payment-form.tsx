"use client";

import { Minus, Plus, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MIN_AMOUNT_SATANG,
  validatePaymentSettings,
  type PaymentSettings,
} from "@/lib/payment-settings";
import type { PromptpayType } from "@/lib/promptpay";
import { cn } from "@/lib/utils";

import { UnsavedBar } from "../unsaved-bar";
import { QrPreviewDialog } from "./qr-preview-dialog";

type Field = keyof PaymentSettings;
type FieldError = { field?: Field; message: string };

const FIELD_BY_CODE: Record<string, Field> = {
  PROMPTPAY_ID_INVALID: "promptpayId",
  MIN_AMOUNT_INVALID: "minAmountSatang",
};

const TYPE_OPTIONS: { value: PromptpayType; label: string }[] = [
  { value: "phone", label: "เบอร์โทร" },
  { value: "national_id", label: "เลขบัตรประชาชน" },
];

export function PaymentForm({ initial }: { initial: PaymentSettings }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<FieldError | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function set<K extends Field>(key: K, value: PaymentSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function stepMin(deltaBaht: number) {
    const next = draft.minAmountSatang + deltaBaht * 100;
    set(
      "minAmountSatang",
      Math.min(MIN_AMOUNT_SATANG.max, Math.max(MIN_AMOUNT_SATANG.min, next)),
    );
  }

  async function save() {
    // เช็กฝั่ง client ก่อนเพื่อชี้ช่องที่ผิด — server ตรวจซ้ำเป็นตัวตัดสิน
    const local = validatePaymentSettings(draft);
    if (!local.ok) {
      setError({ field: local.field, message: local.message });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/payment", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        setError({
          field: FIELD_BY_CODE[body.error?.code],
          message: body.error?.message ?? "บันทึกไม่สำเร็จ",
        });
        return;
      }
      setSaved(body);
      setDraft(body);
      router.refresh();
    } catch {
      setError({ message: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: Field) =>
    error?.field === field ? error.message : null;

  return (
    <div className="mt-6 flex flex-col gap-4 pb-24">
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="font-medium">ยอดขั้นต่ำ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ผู้โดเนทต้องโอนอย่างน้อยเท่านี้
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="ลดยอดขั้นต่ำ"
            onClick={() => stepMin(-10)}
          >
            <Minus />
          </Button>
          <div className="relative w-32">
            <Input
              id="minAmount"
              aria-label="ยอดขั้นต่ำ (บาท)"
              inputMode="numeric"
              className="h-9 pr-10 text-center font-mono"
              value={String(draft.minAmountSatang / 100)}
              aria-invalid={Boolean(errorFor("minAmountSatang"))}
              onChange={(e) => {
                const baht = Number(e.target.value.replace(/\D/g, "") || 0);
                set("minAmountSatang", baht * 100);
              }}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              บาท
            </span>
          </div>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="เพิ่มยอดขั้นต่ำ"
            onClick={() => stepMin(10)}
          >
            <Plus />
          </Button>
        </div>
        <FieldMessage message={errorFor("minAmountSatang")} />
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">พร้อมเพย์</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              เปิดเพื่อให้หน้าโดเนทของคุณรับเงินได้
            </p>
          </div>
          <Switch
            aria-label="เปิดรับโดเนท"
            checked={draft.enabled}
            onCheckedChange={(checked) => set("enabled", checked)}
          />
        </div>

        <div className="mt-6 grid gap-5">
          <div className="grid gap-2">
            <span className="text-sm font-medium" id="promptpayType-label">
              ประเภท
            </span>
            <div
              role="radiogroup"
              aria-labelledby="promptpayType-label"
              className="inline-flex w-fit rounded-lg border p-0.5"
            >
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={draft.promptpayType === option.value}
                  onClick={() => set("promptpayType", option.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    draft.promptpayType === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="promptpayId">
              {draft.promptpayType === "phone"
                ? "เบอร์พร้อมเพย์"
                : "เลขบัตรประชาชน"}
            </Label>
            <Input
              id="promptpayId"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono"
              placeholder={
                draft.promptpayType === "phone" ? "08x-xxx-xxxx" : "13 หลัก"
              }
              value={draft.promptpayId}
              aria-invalid={Boolean(errorFor("promptpayId"))}
              onChange={(e) => set("promptpayId", e.target.value)}
            />
            <FieldMessage message={errorFor("promptpayId")} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="accountNameTh">ชื่อบัญชี (ภาษาไทย)</Label>
            <Input
              id="accountNameTh"
              placeholder="สมชาย ใจดี"
              value={draft.accountNameTh}
              aria-invalid={Boolean(errorFor("accountNameTh"))}
              onChange={(e) => set("accountNameTh", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ไม่ต้องใส่คำนำหน้า ใช้ตรวจว่าสลิปโอนเข้าบัญชีคุณจริง
            </p>
            <FieldMessage message={errorFor("accountNameTh")} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="accountNameEn">
              ชื่อบัญชี (ภาษาอังกฤษ){" "}
              <span className="font-normal text-muted-foreground">ไม่บังคับ</span>
            </Label>
            <Input
              id="accountNameEn"
              placeholder="SOMCHAI JAIDEE"
              value={draft.accountNameEn ?? ""}
              aria-invalid={Boolean(errorFor("accountNameEn"))}
              onChange={(e) => set("accountNameEn", e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">
              บางธนาคารแสดงชื่อผู้รับเป็นภาษาอังกฤษบนสลิป ใส่ไว้ช่วยให้ตรวจสลิปได้แม่นขึ้น
            </p>
            <FieldMessage message={errorFor("accountNameEn")} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="showAccountName" className="font-normal">
              แสดงชื่อบัญชีให้ผู้โดเนทเห็น
            </Label>
            <Switch
              id="showAccountName"
              checked={draft.showAccountName}
              onCheckedChange={(checked) => set("showAccountName", checked)}
            />
          </div>

          <div className="border-t pt-5">
            <Button variant="outline" onClick={() => setQrOpen(true)}>
              <QrCode />
              ดูตัวอย่าง QR
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              สแกนด้วยแอปธนาคาร (ไม่ต้องกดโอน) เพื่อเช็กว่าชื่อผู้รับเป็นของคุณ
            </p>
          </div>
        </div>
      </section>

      {error && !error.field && <FieldMessage message={error.message} />}

      <QrPreviewDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        promptpayType={draft.promptpayType}
        promptpayId={draft.promptpayId}
      />

      {dirty && (
        <UnsavedBar
          saving={saving}
          onCancel={() => {
            setDraft(saved);
            setError(null);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

function FieldMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

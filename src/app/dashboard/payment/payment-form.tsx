"use client";

import { Minus, Plus, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IntegerInput } from "@/components/dashboard/form-fields";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/dashboard/section-card";
import { SegmentedControl } from "@/components/dashboard/segmented-control";
import { SettingRow } from "@/components/dashboard/setting-row";
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
import { startNavigationProgress } from "@/lib/navigation-progress";
import { SETUP_STEPS } from "@/lib/setup-steps";
import { cn } from "@/lib/utils";

import { SetupNextBar, SetupSteps } from "../setup-steps";
import { UnsavedBar } from "../unsaved-bar";
import { QrPreviewCard } from "./qr-preview-card";

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

export function PaymentForm({
  initial,
  streamerName,
  setup = false,
}: {
  initial: PaymentSettings;
  streamerName: string;
  /** ตั้งค่าครั้งแรก: เปิดรับโดเนทไว้ให้ + บันทึกแล้วไปขั้นต่อไป */
  setup?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(() =>
    setup ? { ...initial, enabled: true } : initial,
  );
  const [error, setError] = useState<FieldError | null>(null);
  const [saving, setSaving] = useState(false);

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

  /** คืน true เมื่อบันทึกสำเร็จ */
  async function save(): Promise<boolean> {
    // เช็กฝั่ง client ก่อนเพื่อชี้ช่องที่ผิด — server ตรวจซ้ำเป็นตัวตัดสิน
    const local = validatePaymentSettings(draft);
    if (!local.ok) {
      setError({ field: local.field, message: local.message });
      return false;
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
        return false;
      }
      setSaved(body);
      setDraft(body);
      router.refresh();
      return true;
    } catch {
      setError({ message: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndNext() {
    if (dirty && !(await save())) return;
    startNavigationProgress();
    router.push(SETUP_STEPS[1].href);
  }

  const errorFor = (field: Field) =>
    error?.field === field ? error.message : null;

  return (
    <div className="pb-24">
      {setup && <SetupSteps current={1} />}
      <PageTitle
        title="ช่องทางรับเงิน"
        description="เงินโดเนทโอนตรงเข้าพร้อมเพย์ของคุณ ระบบไม่ได้ถือเงินไว้"
        actions={
          <label
            htmlFor="enabled"
            className={cn(
              "flex w-fit cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-2.5",
              draft.enabled && "border-primary/40 bg-primary/5",
            )}
          >
            <span className="text-sm">
              <span className="block font-medium">
                {draft.enabled ? "เปิดรับโดเนทอยู่" : "ปิดรับโดเนท"}
              </span>
              <span className="text-xs text-muted-foreground">
                {draft.enabled ? "ผู้ชมโอนผ่านลิงก์ได้" : "หน้าโดเนทจะขึ้นว่าปิดรับ"}
              </span>
            </span>
            <Switch
              id="enabled"
              aria-label="เปิดรับโดเนท"
              checked={draft.enabled}
              onCheckedChange={(checked) => set("enabled", checked)}
            />
          </label>
        }
      />

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <SectionCard
          icon={Wallet}
          title="ข้อมูลพร้อมเพย์"
          description="บัญชีที่รับเงินโดเนท ระบบใช้สร้าง QR และตรวจว่าสลิปโอนเข้าบัญชีคุณจริง"
        >
          <div className="grid gap-5">
            <div className="grid gap-2">
              <span className="text-sm font-medium">ยอดขั้นต่ำ</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label="ลดยอดขั้นต่ำ"
                  onClick={() => stepMin(-10)}
                >
                  <Minus />
                </Button>
                <div className="relative w-32">
                  <IntegerInput
                    id="minAmount"
                    aria-label="ยอดขั้นต่ำ (บาท)"
                    className="h-9 pr-10 text-center font-mono"
                    value={draft.minAmountSatang / 100}
                    min={MIN_AMOUNT_SATANG.min / 100}
                    max={MIN_AMOUNT_SATANG.max / 100}
                    aria-invalid={Boolean(errorFor("minAmountSatang"))}
                    onChange={(baht) => set("minAmountSatang", baht * 100)}
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
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium">ประเภท</span>
              <SegmentedControl
                label="ประเภท"
                options={TYPE_OPTIONS}
                value={draft.promptpayType}
                onChange={(v) => set("promptpayType", v)}
              />
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
                <span className="font-normal text-muted-foreground">
                  ไม่บังคับ
                </span>
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

            <div className="border-t pt-4">
              <h3 className="font-medium">ตั้งค่าขั้นสูง</h3>
              <div className="mt-3 divide-y">
                <SettingRow
                  id="showAccountName"
                  label="แสดงชื่อบัญชีให้ผู้โดเนทเห็น"
                  hint="ปิดไว้ หน้าโดเนทจะแสดงชื่อของคุณบนเว็บแทนชื่อบัญชี"
                  checked={draft.showAccountName}
                  onChange={(checked) => set("showAccountName", checked)}
                />
                <SettingRow
                  id="allowAnonymous"
                  label="บริจาคโดยไม่เปิดเผยชื่อ"
                  hint="ผู้บริจาคติ๊กได้ แล้ว alert จะขึ้นเป็น Anonymous"
                  checked={draft.allowAnonymous}
                  onChange={(checked) => set("allowAnonymous", checked)}
                />
              </div>
            </div>
          </div>

          {error && !error.field && (
            <div className="mt-4">
              <FieldMessage message={error.message} />
            </div>
          )}
        </SectionCard>

        <QrPreviewCard
          promptpayType={draft.promptpayType}
          promptpayId={draft.promptpayId}
          recipientName={
            draft.showAccountName && draft.accountNameTh.trim()
              ? draft.accountNameTh.trim()
              : streamerName
          }
          showsAccountName={draft.showAccountName}
        />
      </div>

      {setup ? (
        <SetupNextBar
          current={1}
          busy={saving}
          nextLabel={dirty ? "บันทึกและไปขั้นต่อไป" : "ไปขั้นต่อไป"}
          onNext={saveAndNext}
        />
      ) : (
        dirty && (
          <UnsavedBar
            saving={saving}
            onCancel={() => {
              setDraft(saved);
              setError(null);
            }}
            onSave={save}
          />
        )
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

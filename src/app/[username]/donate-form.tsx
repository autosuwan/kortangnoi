"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { AlertCard } from "@/components/alert-card";
import { ColorWheel } from "@/components/color-wheel";
import { GifPicker } from "@/components/gif-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_TEXT_MAX } from "@/lib/alert-settings";
import {
  ANONYMOUS_NAME,
  DONOR_NAME_MAX,
  MESSAGE_MAX,
  QUICK_AMOUNTS_BAHT,
  validateDonationInput,
} from "@/lib/donation";
import { parseBahtToSatang } from "@/lib/money";
import { startNavigationProgress } from "@/lib/navigation-progress";
import { cn } from "@/lib/utils";
import type { PublicStreamer } from "@/server/services/donation";

const DONOR_KEY = "kortangnoi:donor-key";
export const LAST_DONATION_KEY = "kortangnoi:last-donation";

/** id สุ่มของผู้บริจาค (ไม่ได้ล็อกอิน) ใช้เป็น customer_id ของ KLIPY — คงที่ในเบราว์เซอร์เดิม */
function readDonorKey(): string {
  try {
    let key = localStorage.getItem(DONOR_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(DONOR_KEY, key);
    }
    return key;
  } catch {
    return "anonymous";
  }
}
const noopSubscribe = () => () => {};

export function DonateForm({ streamer }: { streamer: PublicStreamer }) {
  const router = useRouter();
  const { alertOptions: opts } = streamer;
  const canCustomize =
    opts.canPickImage || opts.canPickColor || opts.canPickSupportText;
  const quickAmounts = QUICK_AMOUNTS_BAHT.filter(
    (b) => b * 100 >= streamer.minAmountSatang,
  );

  const [donorName, setDonorName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const isAnonymous = streamer.allowAnonymous && anonymous;
  const [amount, setAmount] = useState(
    String(quickAmounts[0] ?? streamer.minAmountSatang / 100),
  );
  const [message, setMessage] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [nameColor, setNameColor] = useState(opts.defaults.nameColor);
  const [supportText, setSupportText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const donorKey = useSyncExternalStore(noopSubscribe, readDonorKey, () => "");

  const amountSatang = parseBahtToSatang(amount) ?? 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = {
      donorName: isAnonymous ? "" : donorName,
      anonymous: isAnonymous,
      amount,
      message,
      alertStyle: canCustomize
        ? {
            mediaUrl: opts.canPickImage ? gifUrl : undefined,
            nameColor: opts.canPickColor ? nameColor : undefined,
            supportText: opts.canPickSupportText ? supportText : undefined,
          }
        : null,
    };
    const local = validateDonationInput(body, streamer.minAmountSatang, {
      allowAnonymous: streamer.allowAnonymous,
    });
    if (!local.ok) {
      setError(local.message);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/${encodeURIComponent(streamer.username)}/donations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "สร้างรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
        setSubmitting(false);
        return;
      }
      const link = `/${streamer.username}/d/${data.donationId}?t=${data.accessToken}`;
      // เผื่อปิดหน้าตอนสลับไปแอปธนาคาร จะได้กลับมารายการเดิมได้
      try {
        localStorage.setItem(LAST_DONATION_KEY, link);
      } catch {}
      startNavigationProgress();
      router.push(link);
    } catch {
      setError("สร้างรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="donorName">ชื่อที่แสดง</Label>
        <Input
          id="donorName"
          maxLength={DONOR_NAME_MAX}
          autoComplete="nickname"
          placeholder={isAnonymous ? ANONYMOUS_NAME : "ชื่อที่จะขึ้นบนจอ"}
          disabled={isAnonymous}
          value={isAnonymous ? "" : donorName}
          onChange={(e) => setDonorName(e.target.value)}
        />
        {streamer.allowAnonymous && (
          <label className="mt-1 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            ไม่เปิดเผยชื่อ (ขึ้นเป็น {ANONYMOUS_NAME})
          </label>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">ยอด (บาท)</Label>
        {quickAmounts.length > 0 && (
          <div
            className="grid grid-cols-4 gap-2"
            role="group"
            aria-label="ยอดด่วน"
          >
            {quickAmounts.map((baht) => (
              <button
                key={baht}
                type="button"
                aria-pressed={amount === String(baht)}
                onClick={() => setAmount(String(baht))}
                className={cn(
                  "h-10 rounded-lg border font-mono text-sm transition-colors",
                  amount === String(baht)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                {baht}
              </button>
            ))}
          </div>
        )}
        <Input
          id="amount"
          inputMode="decimal"
          className="h-10 font-mono text-base"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          ขั้นต่ำ {(streamer.minAmountSatang / 100).toLocaleString("en-US")} บาท
        </p>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="message">ข้อความ</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {message.length}/{MESSAGE_MAX}
          </span>
        </div>
        <Textarea
          id="message"
          maxLength={MESSAGE_MAX}
          placeholder="ไม่บังคับ"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {canCustomize && (
        <section className="grid gap-4 rounded-xl border p-4">
          <h2 className="text-sm font-medium">ปรับแต่ง alert ของคุณ</h2>

          {opts.canPickImage && donorKey && (
            <div className="grid gap-2">
              <span className="text-sm">รูป GIF</span>
              <GifPicker
                customerKey={donorKey}
                selectedUrl={gifUrl}
                disabled={false}
                onSelect={(gif) => setGifUrl(gif.url)}
              />
            </div>
          )}

          {opts.canPickColor && (
            <div className="grid gap-2">
              <span className="text-sm">สีชื่อ</span>
              <ColorWheel
                label="วงล้อสีชื่อ"
                value={nameColor}
                onChange={setNameColor}
              />
            </div>
          )}

          {opts.canPickSupportText && (
            <div className="grid gap-1.5">
              <Label htmlFor="supportText">คำสนับสนุน</Label>
              <Input
                id="supportText"
                maxLength={SUPPORT_TEXT_MAX}
                placeholder={opts.defaults.supportText}
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
              />
            </div>
          )}

          <div
            className="flex justify-center overflow-hidden rounded-lg p-4"
            style={{
              backgroundColor: "#e5e5e5",
              backgroundImage:
                "conic-gradient(#d4d4d4 25%, transparent 0 50%, #d4d4d4 0 75%, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          >
            <AlertCard
              imageUrl={gifUrl ?? opts.defaults.imageUrl}
              donorName={
                isAnonymous ? ANONYMOUS_NAME : donorName.trim() || "ชื่อของคุณ"
              }
              supportText={supportText.trim() || opts.defaults.supportText}
              amountSatang={amountSatang}
              message={message.trim() || null}
              nameColor={
                opts.canPickColor ? nameColor : opts.defaults.nameColor
              }
              className="scale-90"
            />
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        ไปหน้าจ่ายเงิน
      </Button>
    </form>
  );
}

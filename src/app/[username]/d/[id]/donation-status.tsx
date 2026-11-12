"use client";

import {
  CircleCheck,
  CircleX,
  Download,
  Hourglass,
  ImageUp,
  Loader2,
  Paperclip,
  Send,
  TimerOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatSatangNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DonorDonationView } from "@/server/services/donation";

import { DonateShell } from "../../donate-shell";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function DonationStatus({ id }: { id: string }) {
  const token = useSearchParams().get("t") ?? "";
  const [view, setView] = useState<DonorDonationView | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/public/donations/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setError(
        res.status === 404
          ? "ไม่พบรายการนี้ ลิงก์อาจไม่ครบ"
          : "โหลดรายการไม่สำเร็จ ลองรีเฟรช",
      );
      return;
    }
    setView(await res.json());
  }, [id, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลครั้งแรกจาก API
    load();
  }, [load]);

  if (error) {
    return (
      <DonateShell streamer={null} step={2}>
        <p role="alert" className="py-6 text-center text-muted-foreground">
          {error}
        </p>
      </DonateShell>
    );
  }
  if (!view) {
    return (
      <DonateShell streamer={null} step={2}>
        <div
          className="flex justify-center py-16"
          role="status"
          aria-label="กำลังโหลด"
        >
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </DonateShell>
    );
  }

  const attachingNow =
    attaching || (view.status === "awaiting_slip" && view.attemptsLeft < 3);
  const step =
    view.status === "awaiting_slip" && !attachingNow
      ? 2
      : view.status === "expired" && !attaching
        ? 2
        : 3;

  return (
    <DonateShell streamer={view.streamer} step={step}>
      {(view.status === "awaiting_slip" || view.status === "expired") &&
      attachingNow ? (
        <SlipStep
          id={id}
          token={token}
          view={view}
          onBack={
            view.status === "awaiting_slip" ? () => setAttaching(false) : null
          }
          onDone={load}
        />
      ) : view.status === "awaiting_slip" ? (
        <PayStep
          view={view}
          onExpired={load}
          onAttach={() => setAttaching(true)}
        />
      ) : view.status === "expired" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <TimerOff className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">หมดเวลาแล้ว</p>
          <p className="text-sm text-muted-foreground">
            QR นี้ใช้ไม่ได้แล้ว ถ้ายังไม่ได้โอน สร้างรายการใหม่ได้เลย
          </p>
          <Link
            href={`/${view.streamer.username}`}
            className="mt-2 text-sm font-medium text-primary underline underline-offset-2"
          >
            สร้างรายการใหม่
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setAttaching(true)}>
            <Paperclip />
            โอนไปแล้ว? แนบสลิป
          </Button>
        </div>
      ) : view.status === "verifying" ? (
        <Checking />
      ) : (
        <ResultCard view={view} />
      )}
    </DonateShell>
  );
}

function Checking() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 py-10 text-center"
    >
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p>กำลังตรวจสอบสลิป...</p>
    </div>
  );
}

/** ผลสุดท้ายของรายการ: ผ่าน / รอสตรีมเมอร์ตรวจ / ไม่ผ่าน */
function ResultCard({ view }: { view: DonorDonationView }) {
  const ui = {
    approved: {
      icon: CircleCheck,
      className: "text-green-600",
      title: "สำเร็จ",
    },
    pending_review: {
      icon: Hourglass,
      className: "text-amber-600",
      title: "รอสตรีมเมอร์ตรวจสอบ",
    },
    rejected: { icon: CircleX, className: "text-destructive", title: "ไม่ผ่าน" },
  } as const;
  const item =
    view.status in ui ? ui[view.status as keyof typeof ui] : ui.pending_review;
  const Icon = item.icon;
  return (
    <div
      role="status"
      data-testid="slip-result"
      data-status={view.status}
      className="flex flex-col items-center gap-3 py-6 text-center"
    >
      <Icon className={cn("size-10", item.className)} aria-hidden />
      <p className="text-lg font-medium">{item.title}</p>
      {view.resultMessage && (
        <p className="text-sm text-muted-foreground">{view.resultMessage}</p>
      )}
      {view.status === "rejected" && (
        <Link
          href={`/${view.streamer.username}`}
          className="mt-2 text-sm font-medium text-primary underline underline-offset-2"
        >
          สร้างรายการใหม่
        </Link>
      )}
    </div>
  );
}

const MAX_SIDE = 1600;
const SEND_AS_IS_BYTES = 3.5 * 1024 * 1024;

/** ย่อรูปก่อนส่ง (Vercel รับ body ≤ 4.5 MB) — รูปเล็กพอแล้วส่งไฟล์เดิม จะได้ QR คมที่สุด */
async function prepareSlip(file: File): Promise<Blob> {
  if (
    file.size <= SEND_AS_IS_BYTES &&
    /^image\/(jpeg|png|webp)$/.test(file.type)
  ) {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      "image/jpeg",
      0.92,
    ),
  );
}

function SlipStep({
  id,
  token,
  view,
  onBack,
  onDone,
}: {
  id: string;
  token: string;
  view: DonorDonationView;
  onBack: (() => void) | null;
  onDone: () => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryMessage = view.attemptsLeft < 3 ? view.resultMessage : null;

  function choose(next: File | undefined) {
    if (!next) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setError(null);
  }

  async function send() {
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", await prepareSlip(file), "slip");
      const res = await fetch(
        `/api/public/donations/${encodeURIComponent(id)}/slip?t=${encodeURIComponent(token)}`,
        { method: "POST", body: form },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "ส่งสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
        setSending(false);
        return;
      }
      setFile(null);
      setPreview(null);
      await onDone();
    } catch {
      setError("ส่งสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
    setSending(false);
  }

  if (sending) return <Checking />;

  return (
    <div className="flex flex-col gap-4">
      {retryMessage && (
        <div
          role="alert"
          data-testid="slip-retry"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <CircleX
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <div>
            <p>{retryMessage}</p>
            <p className="mt-0.5 text-muted-foreground">
              แนบใหม่ได้อีก {view.attemptsLeft} ครั้ง
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        แนบรูปสลิปที่เห็น QR มุมขวาล่างชัดๆ ระบบจะตรวจให้อัตโนมัติ
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="เลือกรูปสลิป"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- พรีวิวไฟล์ในเครื่อง
        <img
          src={preview}
          alt="พรีวิวสลิป"
          className="mx-auto max-h-80 rounded-lg border object-contain"
        />
      ) : null}

      <Button
        variant={file ? "outline" : "default"}
        size="lg"
        className="h-11"
        onClick={() => input.current?.click()}
      >
        <ImageUp />
        {file ? "เลือกรูปใหม่" : "เลือกรูปสลิป"}
      </Button>
      {file && (
        <Button size="lg" className="h-11" onClick={send}>
          <Send />
          ส่งตรวจ
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          กลับไปดู QR
        </Button>
      )}
    </div>
  );
}

function PayStep({
  view,
  onExpired,
  onAttach,
}: {
  view: DonorDonationView;
  onExpired: () => void;
  onAttach: () => void;
}) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const now = useNow();
  const remaining = Date.parse(view.expiresAt) - now;
  const expiredCalled = useRef(false);

  useEffect(() => {
    // วาดเป็นรูป (ไม่ใช้ canvas ตรงๆ เพราะ qrcode ใส่ width แบบ inline จนล้นการ์ดบนมือถือ)
    let cancelled = false;
    QRCode.toDataURL(view.qrPayload, { margin: 1, width: 560 }).then((src) => {
      if (!cancelled) setQrSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [view.qrPayload]);

  useEffect(() => {
    if (remaining <= 0 && !expiredCalled.current) {
      expiredCalled.current = true;
      onExpired();
    }
  }, [remaining, onExpired]);

  function saveQr() {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `kortangnoi-${formatSatangNumber(view.amountSatang)}baht.png`;
    a.click();
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="flex items-center gap-3"
        aria-label="ชำระด้วยพร้อมเพย์ / Thai QR Payment"
      >
        <Image
          src="/brands/thai-qr.png"
          alt="Thai QR Payment"
          width={243}
          height={96}
          className="h-8 w-auto"
        />
        <Image
          src="/brands/promptpay.png"
          alt="พร้อมเพย์"
          width={286}
          height={96}
          className="h-8 w-auto"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        สแกนด้วยแอปธนาคารไหนก็ได้ ยอดถูกล็อกไว้แล้ว
      </p>
      {qrSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL ที่สร้างฝั่ง client
        <img
          src={qrSrc}
          alt="QR พร้อมเพย์"
          data-testid="donation-qr"
          className="size-64 max-w-full rounded-lg border bg-white p-2"
        />
      ) : (
        <div className="size-64 max-w-full animate-pulse rounded-lg border bg-muted" />
      )}
      <div>
        <p className="font-mono text-4xl font-semibold text-primary">
          {formatSatangNumber(view.amountSatang)}
          <span className="ml-1.5 text-lg text-foreground">บาท</span>
        </p>
        <p
          data-testid="pay-recipient"
          className="mt-1 text-sm text-muted-foreground"
        >
          {view.accountName
            ? `ชื่อบัญชี: ${view.accountName}`
            : `ผู้รับ: ${view.streamer.displayName}`}
        </p>
      </div>
      <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
        โอนยอดให้ตรงทุกสตางค์ ภายใน{" "}
        <span data-testid="countdown" className="font-mono font-medium">
          {formatCountdown(remaining)}
        </span>
      </p>
      <div className="grid w-full gap-2">
        <Button variant="outline" onClick={saveQr}>
          <Download />
          บันทึก QR
        </Button>
        <Button size="lg" className="h-11" onClick={onAttach}>
          <Paperclip />
          โอนแล้ว แนบสลิป
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Download, Loader2, Paperclip, TimerOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatSatangNumber } from "@/lib/money";
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
      <DonateShell streamerName="" step={2}>
        <p role="alert" className="py-6 text-center text-muted-foreground">
          {error}
        </p>
      </DonateShell>
    );
  }
  if (!view) {
    return (
      <DonateShell streamerName="" step={2}>
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

  return (
    <DonateShell streamerName={view.streamer.displayName} step={2}>
      {view.status === "awaiting_slip" ? (
        <PayStep view={view} onExpired={load} />
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
        </div>
      ) : (
        <p role="status" className="py-6 text-center text-muted-foreground">
          {view.resultMessage ?? "รายการนี้ดำเนินการแล้ว"}
        </p>
      )}
    </DonateShell>
  );
}

function PayStep({
  view,
  onExpired,
}: {
  view: DonorDonationView;
  onExpired: () => void;
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
      <p className="text-sm text-muted-foreground">
        สแกนด้วยแอปธนาคาร ยอดถูกล็อกไว้แล้ว
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
        {view.accountName && (
          <p className="mt-1 text-sm text-muted-foreground">
            ชื่อบัญชี: {view.accountName}
          </p>
        )}
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
        <Button disabled>
          <Paperclip />
          โอนแล้ว แนบสลิป · เร็วๆ นี้
        </Button>
      </div>
    </div>
  );
}

"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatBangkokDateTime } from "@/lib/bangkok-time";
import { formatSatangNumber } from "@/lib/money";
import type { DonationDetail } from "@/server/services/streamer-donations";

import { StatusBadge } from "./status-badge";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** รายละเอียดโดเนท (F5) + อนุมัติ/ปฏิเสธรายการรอตรวจ (F6) */
export function DonationDrawer({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<DonationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async (donationId: string) => {
    setDetail(null);
    setError(null);
    const res = await fetch(
      `/api/donations/${encodeURIComponent(donationId)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) {
      setError("ไม่พบรายการนี้");
      return;
    }
    setDetail(await res.json());
  }, []);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดรายละเอียดเมื่อเปิด drawer
    setRejecting(false);
    setReason("");
    load(id);
  }, [id, load]);

  async function act(action: "approve" | "reject") {
    if (!detail) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/donations/${detail.id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason }) : undefined,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "ทำรายการไม่สำเร็จ");
        if (res.status === 409) await load(detail.id);
        return;
      }
      setDetail(body);
      setRejecting(false);
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>รายละเอียดโดเนท</SheetTitle>
          <SheetDescription className="sr-only">
            ข้อมูลรายการโดเนทและสลิป
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6 text-sm">
          {!detail && !error && (
            <div role="status" aria-label="กำลังโหลด" className="grid gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}

          {detail && (
            <>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-lg font-medium">
                    {detail.donorName}
                  </p>
                  <StatusBadge status={detail.status} />
                </div>
                <p className="mt-1 font-mono text-3xl font-semibold text-primary">
                  {formatSatangNumber(detail.amountSatang)}
                  <span className="ml-1 text-base text-foreground">บาท</span>
                </p>
                {detail.message && (
                  <p className="mt-2 rounded-lg bg-muted px-3 py-2 break-words whitespace-pre-line">
                    {detail.message}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  สร้างเมื่อ {formatBangkokDateTime(detail.createdAt)}
                  {detail.approvedVia &&
                    ` · ${detail.approvedVia === "auto" ? "ตรวจผ่านอัตโนมัติ" : "อนุมัติด้วยมือ"}`}
                </p>
              </div>

              {detail.reasons.length > 0 && detail.status !== "approved" && (
                <div
                  data-testid="verify-reasons"
                  className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950"
                >
                  <p className="flex items-center gap-1.5 font-medium">
                    <CircleAlert className="size-4" aria-hidden />
                    ทำไมระบบตรวจอัตโนมัติไม่ผ่าน
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    {detail.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.slip && (
                <div className="divide-y rounded-lg border px-3">
                  <Row label="ชื่อผู้โอน (จากสลิป)">
                    <span data-testid="sender-name">
                      {detail.slip.senderName ?? "–"}
                      {detail.slip.senderNameEn && (
                        <span className="block text-xs text-muted-foreground">
                          {detail.slip.senderNameEn}
                        </span>
                      )}
                    </span>
                  </Row>
                  <Row label="ธนาคาร">{detail.slip.bank ?? "–"}</Row>
                  <Row label="เวลาโอน">
                    {detail.slip.transferredAt
                      ? formatBangkokDateTime(detail.slip.transferredAt)
                      : "–"}
                  </Row>
                  <Row label="ยอดในสลิป">
                    <span className="font-mono">
                      {detail.slip.amountSatang !== null
                        ? `${formatSatangNumber(detail.slip.amountSatang)} บาท`
                        : "–"}
                    </span>
                  </Row>
                </div>
              )}

              {detail.slipUrl && (
                <a href={detail.slipUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL อายุสั้นจาก storage */}
                  <img
                    src={detail.slipUrl}
                    alt="รูปสลิป"
                    className="max-h-96 w-full rounded-lg border object-contain"
                  />
                </a>
              )}

              {detail.reviewNote && (
                <p className="text-muted-foreground">
                  เหตุผลที่ปฏิเสธ: {detail.reviewNote}
                </p>
              )}

              {detail.status === "pending_review" && (
                <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-popover px-4 pt-3">
                  {rejecting ? (
                    <>
                      <Textarea
                        aria-label="เหตุผลที่ปฏิเสธ"
                        placeholder="เหตุผล (ไม่บังคับ) ผู้บริจาคจะเห็นข้อความนี้"
                        maxLength={200}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setRejecting(false)}
                          disabled={busy !== null}
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => act("reject")}
                          disabled={busy !== null}
                        >
                          {busy === "reject" && (
                            <Loader2 className="animate-spin" />
                          )}
                          ยืนยันปฏิเสธ
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setRejecting(true)}
                        disabled={busy !== null}
                      >
                        ปฏิเสธ
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => act("approve")}
                        disabled={busy !== null}
                      >
                        {busy === "approve" && (
                          <Loader2 className="animate-spin" />
                        )}
                        อนุมัติ · ขึ้น alert
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

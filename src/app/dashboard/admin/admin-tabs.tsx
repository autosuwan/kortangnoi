"use client";

import {
  ExternalLink,
  Inbox,
  Loader2,
  Search,
  Server,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { SectionCard } from "@/components/dashboard/section-card";
import { SegmentedControl } from "@/components/dashboard/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  STATUS_NOTE_MAX,
  STREAMER_STATUS_LABELS,
  STREAMER_STATUSES,
  type StreamerStatusValue,
} from "@/lib/application";
import { formatBangkokDateTime } from "@/lib/bangkok-time";
import { formatSatangNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  AdminUserRow,
  getUserDetail,
  UserAction,
} from "@/server/services/admin";

type Tab = "pending" | "users" | "system";
type Detail = Awaited<ReturnType<typeof getUserDetail>>;
type List = {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS_TONE: Record<StreamerStatusValue, string> = {
  pending_application: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-700",
  approved: "bg-green-500/10 text-green-700",
  rejected: "bg-red-500/10 text-red-700",
  suspended: "bg-neutral-800 text-white",
};

function StatusPill({ status }: { status: StreamerStatusValue }) {
  return (
    <span
      data-testid="user-status"
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_TONE[status],
      )}
    >
      {STREAMER_STATUS_LABELS[status]}
    </span>
  );
}

export function AdminTabs({
  pendingCount,
  system,
}: {
  pendingCount: number;
  system: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(pendingCount > 0 ? "pending" : "users");
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const router = useRouter();

  return (
    <div className="grid gap-4">
      <SegmentedControl<Tab>
        role="tab"
        label="เมนูแอดมิน"
        fullWidth
        options={[
          {
            value: "pending",
            label: `คำขอสมัคร (${pendingCount})`,
            icon: Inbox,
          },
          { value: "users", label: "ผู้ใช้ทั้งหมด", icon: Users },
          { value: "system", label: "ระบบ", icon: Server },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "system" ? (
        system
      ) : (
        <UsersPanel
          key={tab + version}
          fixedStatus={tab === "pending" ? "pending" : null}
          onOpen={setOpenId}
        />
      )}
      <UserSheet
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          setVersion((v) => v + 1);
          router.refresh(); // จำนวนรอตรวจ/สถิติ
        }}
      />
    </div>
  );
}

function UsersPanel({
  fixedStatus,
  onOpen,
}: {
  fixedStatus: StreamerStatusValue | null;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StreamerStatusValue | "all">("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<List | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    const st = fixedStatus ?? (status === "all" ? null : status);
    if (st) params.set("status", st);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/users?${params}`, {
      cache: "no-store",
    });
    if (res.ok) setList(await res.json());
  }, [fixedStatus, status, q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

  return (
    <SectionCard
      icon={fixedStatus ? UserCheck : Users}
      title={fixedStatus ? "รอตรวจ" : "ผู้ใช้ทั้งหมด"}
      description={
        fixedStatus
          ? "กดเพื่อดูใบสมัคร แล้วอนุมัติหรือไม่อนุมัติ"
          : "ค้นหา ดูใบสมัคร ระงับ/ยกเลิกระงับ"
      }
      bodyClassName="grid gap-4 px-0 pb-0"
    >
      {!fixedStatus && (
        <div className="flex flex-col gap-2 px-6 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="ค้นหาผู้ใช้"
              placeholder="ชื่อที่แสดง หรือ username"
              className="pl-8"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="กรองสถานะ"
            className="h-9 rounded-lg border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StreamerStatusValue | "all");
              setPage(1);
            }}
          >
            <option value="all">ทุกสถานะ</option>
            {STREAMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STREAMER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      {!list ? (
        <div
          role="status"
          aria-label="กำลังโหลด"
          className="grid gap-2 px-6 pb-6"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : list.items.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={fixedStatus ? Inbox : Users}
            title={fixedStatus ? "ไม่มีคำขอรอตรวจ" : "ไม่พบผู้ใช้"}
          />
        </div>
      ) : (
        <ul className="divide-y border-t" data-testid="admin-users">
          {list.items.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                data-testid="admin-user-row"
                onClick={() => onOpen(u.id)}
                className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {u.displayName || u.applicantName || "(ยังไม่ตั้งชื่อ)"}
                    {u.username && (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        @{u.username}
                      </span>
                    )}
                    {u.displayName && u.applicantName && (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        · {u.applicantName}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {u.submittedAt
                      ? `ส่งใบสมัคร ${formatBangkokDateTime(u.submittedAt)}`
                      : `สมัคร ${formatBangkokDateTime(u.createdAt)}`}
                    {u.status === "approved" &&
                      ` · เดือนนี้ ${formatSatangNumber(u.monthSatang)} บาท (${u.monthCount} รายการ)${u.donationsEnabled ? "" : " · ปิดรับโดเนท"}`}
                  </span>
                </span>
                <StatusPill status={u.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {list && pages > 1 && (
        <div className="flex items-center justify-end gap-2 px-6 pb-4 text-sm">
          <span className="text-muted-foreground">
            หน้า {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ก่อนหน้า
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

const ACTION_LABEL: Record<UserAction, string> = {
  approve: "อนุมัติ",
  reject: "ไม่อนุมัติ",
  suspend: "ระงับบัญชี",
  unsuspend: "ยกเลิกระงับ",
};

function UserSheet({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<UserAction | null>(null);
  const [noteFor, setNoteFor] = useState<UserAction | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดรายละเอียดเมื่อเปิด
    setDetail(null);
    setError(null);
    setNoteFor(null);
    setNote("");
    fetch(`/api/admin/users/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setDetail(d) : setError("ไม่พบผู้ใช้นี้")));
  }, [id]);

  async function act(action: UserAction) {
    if (!detail) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      setDetail(body);
      setNoteFor(null);
      setNote("");
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  const actions: UserAction[] = !detail
    ? []
    : detail.status === "pending"
      ? ["reject", "approve"]
      : detail.status === "approved" && !detail.isAdmin
        ? ["suspend"]
        : detail.status === "suspended"
          ? ["unsuspend"]
          : [];
  const a = detail?.application;

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>ข้อมูลผู้ใช้</SheetTitle>
          <SheetDescription className="sr-only">
            ใบสมัครและการจัดการสถานะ
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-6 text-sm">
          {!detail && !error && (
            <div role="status" aria-label="กำลังโหลด" className="grid gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {detail && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">
                    {detail.displayName ||
                      detail.application?.realName ||
                      "(ยังไม่ตั้งชื่อ)"}
                  </p>
                  {detail.username && (
                    <a
                      href={`/${detail.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:underline"
                    >
                      @{detail.username}
                    </a>
                  )}
                </div>
                <StatusPill status={detail.status} />
              </div>
              {detail.note && (
                <p className="rounded-lg bg-muted p-3 text-muted-foreground">
                  เหตุผล: {detail.note}
                </p>
              )}
              <dl className="grid gap-1.5 rounded-xl border p-4">
                <Row label="ชื่อจากบัญชี">{detail.accountName ?? "–"}</Row>
                <Row label="สมัครเมื่อ">
                  {formatBangkokDateTime(detail.createdAt)}
                </Row>
                {a && (
                  <>
                    <Row label="ชื่อจริง">{a.realName}</Row>
                    <Row label="เบอร์โทร">
                      <a href={`tel:${a.phone}`} className="hover:underline">
                        {a.phone}
                      </a>
                    </Row>
                    <Row label="ส่งใบสมัคร">
                      {formatBangkokDateTime(a.submittedAt)}
                    </Row>
                    <Row label="ยอมรับ PDPA">
                      {formatBangkokDateTime(a.pdpaAcceptedAt)} (ฉบับ{" "}
                      {a.pdpaVersion})
                    </Row>
                  </>
                )}
              </dl>
              {a ? (
                <>
                  <div className="grid gap-1.5">
                    <p className="font-medium">ลิงก์ช่อง</p>
                    {a.channelUrls.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1.5 break-all text-primary hover:underline"
                      >
                        <ExternalLink
                          className="size-3.5 shrink-0"
                          aria-hidden
                        />
                        {u}
                      </a>
                    ))}
                  </div>
                  <div className="grid gap-1.5">
                    <p className="font-medium">รูปหน้าช่อง</p>
                    <div className="grid grid-cols-2 gap-2">
                      {a.imageUrls.map((src, i) => (
                        <a
                          key={src}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL อายุสั้น */}
                          <img
                            src={src}
                            alt={`รูปหน้าช่อง ${i + 1}`}
                            className="aspect-video w-full rounded-lg border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  ไม่มีใบสมัคร (ผู้ใช้ก่อนเปิดระบบสมัคร หรือยังไม่ส่ง)
                </p>
              )}

              {noteFor && (
                <div className="grid gap-1.5">
                  <Textarea
                    aria-label="เหตุผล"
                    placeholder="เหตุผล (ผู้ใช้จะเห็นข้อความนี้)"
                    maxLength={STATUS_NOTE_MAX}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              )}
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              {actions.length > 0 && (
                <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-popover px-4 pt-3">
                  {noteFor ? (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={() => setNoteFor(null)}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={busy !== null}
                        onClick={() => act(noteFor)}
                      >
                        {busy && <Loader2 className="animate-spin" />}
                        ยืนยัน{ACTION_LABEL[noteFor]}
                      </Button>
                    </>
                  ) : (
                    actions.map((action) => {
                      const needsNote =
                        action === "reject" || action === "suspend";
                      return (
                        <Button
                          key={action}
                          className="flex-1"
                          variant={needsNote ? "outline" : "default"}
                          disabled={busy !== null}
                          onClick={() =>
                            needsNote ? setNoteFor(action) : act(action)
                          }
                        >
                          {busy === action && (
                            <Loader2 className="animate-spin" />
                          )}
                          {ACTION_LABEL[action]}
                        </Button>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
          {error && !detail && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

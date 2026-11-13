"use client";

import {
  CircleAlert,
  Clock,
  ImagePlus,
  Loader2,
  Plus,
  ShieldBan,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  APPLICATION_IMAGE_MAX_BYTES,
  MAX_APPLICATION_IMAGES,
  MAX_CHANNEL_URLS,
  validateApplication,
} from "@/lib/application";
import type { MyApplication } from "@/server/services/application";

const ACCEPT = "image/png,image/jpeg,image/webp";

export function ApplyView({ initial }: { initial: MyApplication }) {
  const [mine, setMine] = useState(initial);
  const [editing, setEditing] = useState(
    initial.status === "pending_application" || initial.status === "rejected",
  );

  if (mine.status === "suspended") {
    return (
      <StatusBox
        icon={ShieldBan}
        tone="destructive"
        title="บัญชีถูกระงับ"
        body={mine.note ?? "ติดต่อแอดมินเพื่อสอบถาม"}
      />
    );
  }

  if (!editing && mine.status === "pending" && mine.application) {
    const a = mine.application;
    return (
      <div className="mt-8 grid gap-5">
        <StatusBox
          icon={Clock}
          title="รอแอดมินตรวจสอบ"
          body="ส่งใบสมัครแล้ว เมื่อได้รับอนุมัติจะเข้าใช้งานได้ทันที (รีเฟรชหน้านี้เพื่อดูสถานะ)"
        />
        <dl className="grid gap-2 rounded-xl border p-4 text-sm">
          <Row label="ชื่อจริง">{a.realName}</Row>
          <Row label="เบอร์โทร">{a.phone}</Row>
          <Row label="ช่อง">
            <span className="grid gap-0.5">
              {a.channelUrls.map((u) => (
                <span key={u} className="break-all">
                  {u}
                </span>
              ))}
            </span>
          </Row>
          <Row label="รูป">{a.imageUrls.length} รูป</Row>
        </dl>
        <Button variant="outline" onClick={() => setEditing(true)}>
          แก้ไขใบสมัคร
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="font-mono text-xs text-muted-foreground">สมัครใช้งาน</p>
      <h1 className="mt-2 text-2xl font-medium">สมัครเป็นสตรีมเมอร์</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        กรอกข้อมูลให้แอดมินพิจารณา อนุมัติแล้วจึงเริ่มรับโดเนทได้
      </p>
      {mine.status === "rejected" && (
        <div
          role="alert"
          className="mt-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            ใบสมัครก่อนหน้าไม่ผ่าน{mine.note ? `: ${mine.note}` : ""} —
            แก้ไขแล้วส่งใหม่ได้
          </span>
        </div>
      )}
      <ApplyForm
        initial={mine}
        onSubmitted={(next) => {
          setMine(next);
          setEditing(false);
        }}
      />
    </div>
  );
}

function ApplyForm({
  initial,
  onSubmitted,
}: {
  initial: MyApplication;
  onSubmitted: (m: MyApplication) => void;
}) {
  const a = initial.application;
  const [realName, setRealName] = useState(a?.realName ?? "");
  const [phone, setPhone] = useState(a?.phone ?? "");
  const [urls, setUrls] = useState<string[]>(
    a?.channelUrls.length ? a.channelUrls : [""],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [pdpa, setPdpa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(
      0,
      MAX_APPLICATION_IMAGES,
    );
    if (next.some((f) => f.size > APPLICATION_IMAGE_MAX_BYTES)) {
      setError("รูปแต่ละรูปต้องไม่เกิน 4 MB");
      return;
    }
    setError(null);
    setFiles(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const channelUrls = urls.map((u) => u.trim()).filter(Boolean);
    const local = validateApplication({ realName, phone, channelUrls, pdpa });
    if (!local.ok) {
      setError(local.message);
      return;
    }
    if (files.length === 0) {
      setError(a ? "แนบรูปหน้าช่องใหม่อีกครั้ง (1–3 รูป)" : "แนบรูปหน้าช่อง 1–3 รูป");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("realName", realName);
      form.append("phone", phone);
      channelUrls.forEach((u) => form.append("channelUrls", u));
      files.forEach((f) => form.append("images", f));
      form.append("pdpa", "true");
      const res = await fetch("/api/apply", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
        return;
      }
      onSubmitted(body);
    } catch {
      setError("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="realName">ชื่อ-นามสกุลจริง</Label>
        <Input
          id="realName"
          autoComplete="name"
          maxLength={100}
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">เบอร์โทรศัพท์มือถือ</Label>
        <Input
          id="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08x-xxx-xxxx"
          maxLength={14}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">
          ลิงก์ช่องของคุณ (Twitch / YouTube / TikTok / Facebook)
        </legend>
        {urls.map((u, i) => (
          <div key={i} className="flex gap-2">
            <Input
              aria-label={`ลิงก์ช่อง ${i + 1}`}
              inputMode="url"
              placeholder="https://"
              value={u}
              onChange={(e) =>
                setUrls(urls.map((x, j) => (j === i ? e.target.value : x)))
              }
            />
            {urls.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`ลบลิงก์ ${i + 1}`}
                onClick={() => setUrls(urls.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            )}
          </div>
        ))}
        {urls.length < MAX_CHANNEL_URLS && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setUrls([...urls, ""])}
          >
            <Plus />
            เพิ่มลิงก์
          </Button>
        )}
      </fieldset>

      <div className="grid gap-2">
        <span className="text-sm font-medium">รูปหน้าช่อง</span>
        <p className="-mt-1 text-xs text-muted-foreground">
          เช่น หน้าช่องที่เห็นชื่อและจำนวนผู้ติดตาม 1–{MAX_APPLICATION_IMAGES} รูป
          (PNG/JPG/WebP ไม่เกิน 4 MB)
          {a ? " — ส่งใหม่ต้องแนบรูปอีกครั้ง" : ""}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL ของไฟล์ที่เลือก */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`ลบรูป ${i + 1}`}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {files.length < MAX_APPLICATION_IMAGES && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-5" aria-hidden />
              เพิ่มรูป
              <input
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                aria-label="แนบรูปหน้าช่อง"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
        <p className="font-medium">การเก็บและใช้ข้อมูลส่วนบุคคล (PDPA)</p>
        <ul className="grid list-disc gap-1 pl-5 text-muted-foreground">
          <li>
            เก็บชื่อจริง เบอร์โทร ลิงก์และรูปช่อง เพื่อยืนยันตัวตนสตรีมเมอร์ และติดต่อเรื่องบัญชีเท่านั้น
          </li>
          <li>แอดมินเท่านั้นที่เห็น ไม่แสดงต่อผู้ชมหรือผู้บริจาค</li>
          <li>ขอดู แก้ไข ลบข้อมูล หรือถอนความยินยอมได้โดยติดต่อแอดมิน</li>
        </ul>
        <Link
          href="/privacy"
          target="_blank"
          className="w-fit text-primary underline-offset-4 hover:underline"
        >
          อ่านนโยบายความเป็นส่วนตัวฉบับเต็ม
        </Link>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={pdpa}
            onChange={(e) => setPdpa(e.target.checked)}
          />
          <span>
            ข้าพเจ้าได้อ่านและยินยอมให้เก็บ ใช้ ข้อมูลส่วนบุคคลตามนโยบายความเป็นส่วนตัว
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" />}
        ส่งใบสมัคร
      </Button>
    </form>
  );
}

function StatusBox({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof Clock;
  title: string;
  body: string;
  tone?: "destructive";
}) {
  return (
    <div
      role="status"
      className={
        tone === "destructive"
          ? "mt-8 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
          : "flex gap-3 rounded-xl border bg-primary/5 p-4"
      }
    >
      <Icon
        className={
          tone === "destructive"
            ? "mt-0.5 size-5 shrink-0 text-destructive"
            : "mt-0.5 size-5 shrink-0 text-primary"
        }
        aria-hidden
      />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
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

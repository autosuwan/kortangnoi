"use client";

import { ImageUp, Loader2, Mic, MicOff, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MicStatus } from "@/lib/mic-level";
import type { AvatarSlot, OverlayWidgetSettings } from "@/lib/overlay-widgets";
import { cn } from "@/lib/utils";

const SLOT_LABEL: Record<AvatarSlot, { title: string; hint: string }> = {
  idle: { title: "รูปตอนเงียบ", hint: "ปากปิด (จำเป็น)" },
  speak: { title: "รูปตอนพูด", hint: "ปากอ้า (ไม่ใส่ = ใช้รูปตอนเงียบ)" },
};

/** อัปโหลดรูป 2 ช่อง + ทดสอบไมค์ + วิธีตั้งค่า OBS */
export function AvatarSetup({
  idleUrl,
  speakUrl,
  onSaved,
  onError,
  micOn,
  onMicToggle,
  micStatus,
  level,
  threshold,
  speaking,
}: {
  idleUrl: string | null;
  speakUrl: string | null;
  onSaved: (s: OverlayWidgetSettings) => void;
  onError: (message: string | null) => void;
  micOn: boolean;
  onMicToggle: (on: boolean) => void;
  micStatus: MicStatus;
  level: number;
  threshold: number;
  speaking: boolean;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SlotPicker
          slot="idle"
          url={idleUrl}
          onSaved={onSaved}
          onError={onError}
        />
        <SlotPicker
          slot="speak"
          url={speakUrl}
          onSaved={onSaved}
          onError={onError}
        />
      </div>

      <div className="grid gap-2 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">ทดสอบไมค์</p>
            <p className="text-xs text-muted-foreground">
              พูดแล้วดูแถบ — เกินเส้นส้ม = ปากอ้า (ปรับ &quot;เกณฑ์เสียงพูด&quot;
              ในส่วนหน้าตา)
            </p>
          </div>
          <Button
            variant={micOn ? "secondary" : "outline"}
            size="sm"
            onClick={() => onMicToggle(!micOn)}
          >
            {micOn ? <MicOff /> : <Mic />}
            {micOn ? "หยุด" : "เริ่มทดสอบ"}
          </Button>
        </div>
        <div
          className="relative h-3 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label="ระดับเสียงไมค์"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-75",
              speaking ? "bg-emerald-500" : "bg-neutral-400",
            )}
            style={{ width: `${level}%` }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-primary"
            style={{ left: `${threshold}%` }}
            aria-hidden
          />
        </div>
        <p className="text-xs text-muted-foreground" data-testid="mic-status">
          {micStatus === "error"
            ? "เปิดไมค์ไม่ได้ — อนุญาตไมค์ในเบราว์เซอร์แล้วลองใหม่"
            : micStatus === "on"
              ? speaking
                ? "กำลังพูด"
                : "เงียบ"
              : micStatus === "starting"
                ? "กำลังเปิดไมค์…"
                : "เสียงไม่ถูกส่งออกจากเครื่อง วิเคราะห์ในเบราว์เซอร์เท่านั้น"}
        </p>
      </div>

      <details className="rounded-xl border bg-muted/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          ตั้งค่า OBS ให้ใช้ไมค์ได้ (ทำครั้งเดียว)
        </summary>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-muted-foreground">
          <li>ปิด OBS ก่อน</li>
          <li>
            <span className="text-foreground">Windows:</span> คลิกขวา shortcut
            ของ OBS → Properties → ช่อง Target ต่อท้ายด้วย
            <code className="mx-1 rounded bg-background px-1 font-mono text-xs">
              --use-fake-ui-for-media-stream
            </code>
            (เว้นวรรคก่อน) → OK แล้วเปิด OBS จาก shortcut นี้
          </li>
          <li>
            <span className="text-foreground">Mac:</span> เปิด Terminal แล้วรัน
            <code className="mx-1 block w-fit rounded bg-background px-1 font-mono text-xs">
              open -a OBS --args --use-fake-ui-for-media-stream
            </code>
          </li>
          <li>
            เพิ่ม Browser Source ด้วยลิงก์ด้านล่าง — ใช้ไมค์ค่าเริ่มต้นของเครื่อง
            (เปลี่ยนได้ที่การตั้งค่าเสียงของ Windows/Mac)
          </li>
        </ol>
      </details>
    </div>
  );
}

function SlotPicker({
  slot,
  url,
  onSaved,
  onError,
}: {
  slot: AvatarSlot;
  url: string | null;
  onSaved: (s: OverlayWidgetSettings) => void;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const label = SLOT_LABEL[slot];

  async function send(method: "POST" | "DELETE", file?: File) {
    setBusy(method === "POST" ? "upload" : "remove");
    onError(null);
    try {
      let body: FormData | undefined;
      if (file) {
        body = new FormData();
        body.append("file", file);
      }
      const res = await fetch(`/api/settings/overlays/avatar/${slot}`, {
        method,
        body,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onError(data?.error?.message ?? "อัปโหลดไม่สำเร็จ");
        return;
      }
      onSaved(data);
    } catch {
      onError("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border p-3">
      <div>
        <p className="text-sm font-medium">{label.title}</p>
        <p className="text-xs text-muted-foreground">{label.hint}</p>
      </div>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-obs-checker">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage
          <img
            src={url}
            alt={label.title}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageUp className="size-8 text-neutral-400" aria-hidden />
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        aria-label={`อัปโหลด${label.title}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) send("POST", file);
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={busy !== null}
          onClick={() => input.current?.click()}
        >
          {busy === "upload" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ImageUp />
          )}
          {url ? "เปลี่ยนรูป" : "อัปโหลด"}
        </Button>
        {url && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            aria-label={`ลบ${label.title}`}
            onClick={() => send("DELETE")}
          >
            {busy === "remove" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

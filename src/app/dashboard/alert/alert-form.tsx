"use client";

import {
  ImageUp,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Send,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AlertCard } from "@/components/alert-card";
import { ColorWheel } from "@/components/color-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ALERT_MEDIA_MAX_BYTES,
  ALERT_SOUND,
  alertImageUrl,
  DURATION_RANGE,
  SUPPORT_TEXT_MAX,
  type AlertSettings,
} from "@/lib/alert-settings";
import { cn } from "@/lib/utils";

import { UnsavedBar } from "../unsaved-bar";
import { GifPicker } from "./gif-picker";

type Editable = Pick<
  AlertSettings,
  "durationSec" | "soundEnabled" | "volume" | "supportText" | "nameColor"
>;
type Media = Pick<AlertSettings, "mediaType" | "mediaUrl">;

const pick = (s: AlertSettings): Editable => ({
  durationSec: s.durationSec,
  soundEnabled: s.soundEnabled,
  volume: s.volume,
  supportText: s.supportText,
  nameColor: s.nameColor,
});

const SAMPLE = {
  donorName: "ผู้ชมใจดี",
  amountSatang: 10000,
  message: "สู้ๆ นะครับ ไลฟ์สนุกมาก!",
};

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return (body?.error?.message as string | undefined) ?? fallback;
}

/** ค่าจาก slider ของ Base UI เป็น number หรือ number[] */
const sliderValue = (v: number | readonly number[]) =>
  Array.isArray(v) ? v[0] : (v as number);

export function AlertForm({
  initial,
  userId,
}: {
  initial: AlertSettings;
  userId: string;
}) {
  const [media, setMedia] = useState<Media>(initial);
  const [saved, setSaved] = useState<Editable>(pick(initial));
  const [draft, setDraft] = useState<Editable>(pick(initial));
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<"upload" | "reset" | "gif" | null>(
    null,
  );
  const [tab, setTab] = useState<"upload" | "gif">(
    initial.mediaType === "gif" ? "gif" : "upload",
  );
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function set<K extends keyof Editable>(key: K, value: Editable[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/alert", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        setError(await readError(res, "บันทึกไม่สำเร็จ"));
        return;
      }
      const next: AlertSettings = await res.json();
      setSaved(pick(next));
      setDraft(pick(next));
    } catch {
      setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    if (file.size > ALERT_MEDIA_MAX_BYTES) {
      setError("ไฟล์ต้องไม่เกิน 4 MB");
      return;
    }
    setMediaBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/settings/alert/media", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setError(await readError(res, "อัปโหลดไม่สำเร็จ"));
        return;
      }
      setMedia(await res.json());
    } catch {
      setError("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setMediaBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  /** เปลี่ยนรูปเป็นค่าเริ่มต้นหรือ GIF — บันทึกทันที */
  async function changeMedia(
    change: { mediaType: "default" } | { mediaType: "gif"; mediaUrl: string },
  ) {
    setMediaBusy(change.mediaType === "default" ? "reset" : "gif");
    setError(null);
    try {
      // ส่งค่าที่บันทึกแล้ว — การเปลี่ยนรูปไม่ควรบันทึกค่าที่ยังแก้ค้างอยู่ไปด้วย
      const res = await fetch("/api/settings/alert", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...saved, ...change }),
      });
      if (!res.ok) {
        setError(await readError(res, "เปลี่ยนรูปไม่สำเร็จ"));
        return;
      }
      setMedia(await res.json());
    } catch {
      setError("เปลี่ยนรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setMediaBusy(null);
    }
  }

  function playSound() {
    const audio = new Audio(ALERT_SOUND);
    audio.volume = draft.volume / 100;
    audio.play().catch(() => {});
  }

  return (
    <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-medium">รูป / GIF</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            แสดงด้านบนของ alert · PNG, JPG, GIF หรือ WebP ไม่เกิน 4 MB
          </p>

          <div
            role="tablist"
            aria-label="แหล่งรูป"
            className="mt-4 inline-flex rounded-lg border p-0.5 text-sm"
          >
            {(
              [
                ["upload", "อัปโหลด", ImageUp],
                ["gif", "ค้นหา GIF", Search],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  tab === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {tab === "gif" && (
            <div className="mt-4">
              <GifPicker
                userId={userId}
                selectedUrl={media.mediaType === "gif" ? media.mediaUrl : null}
                disabled={mediaBusy !== null}
                onSelect={(gif) =>
                  changeMedia({ mediaType: "gif", mediaUrl: gif.url })
                }
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              aria-label="เลือกไฟล์รูป"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            {tab === "upload" && (
              <Button
                variant="outline"
                disabled={mediaBusy !== null}
                onClick={() => fileInput.current?.click()}
              >
                {mediaBusy === "upload" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ImageUp />
                )}
                {mediaBusy === "upload" ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
              </Button>
            )}
            {media.mediaType !== "default" && (
              <Button
                variant="ghost"
                disabled={mediaBusy !== null}
                onClick={() => changeMedia({ mediaType: "default" })}
              >
                {mediaBusy === "reset" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RotateCcw />
                )}
                ใช้ค่าเริ่มต้น
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-medium">ข้อความ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            แสดงเป็น &ldquo;ชื่อผู้บริจาค คำสนับสนุน จำนวนเงิน บาท&rdquo;
          </p>
          <div className="mt-4 grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="supportText">คำสนับสนุน</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {draft.supportText.length}/{SUPPORT_TEXT_MAX}
              </span>
            </div>
            <Input
              id="supportText"
              placeholder="ให้ค่าข้าว"
              maxLength={SUPPORT_TEXT_MAX}
              value={draft.supportText}
              onChange={(e) => set("supportText", e.target.value)}
            />
          </div>
          <div className="mt-5 grid gap-2">
            <span className="text-sm font-medium">สีชื่อผู้บริจาค</span>
            <ColorWheel
              label="วงล้อสีชื่อผู้บริจาค"
              value={draft.nameColor}
              onChange={(hex) => set("nameColor", hex)}
            />
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">ระยะเวลาแสดง</h2>
            <span className="font-mono text-sm" data-testid="duration-value">
              {draft.durationSec} วินาที
            </span>
          </div>
          <Slider
            className="mt-5"
            thumbLabel="ระยะเวลาแสดง (วินาที)"
            min={DURATION_RANGE.min}
            max={DURATION_RANGE.max}
            step={1}
            value={[draft.durationSec]}
            onValueChange={(v) => set("durationSec", sliderValue(v))}
          />
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">เสียง</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                เล่นเสียงสั้นๆ ตอน alert เด้ง
              </p>
            </div>
            <Switch
              aria-label="เปิดเสียง"
              checked={draft.soundEnabled}
              onCheckedChange={(checked) => set("soundEnabled", checked)}
            />
          </div>
          <div
            className={cn(
              "mt-5 flex items-center gap-4",
              !draft.soundEnabled && "opacity-50",
            )}
          >
            <Volume2
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Slider
              thumbLabel="ระดับเสียง"
              min={0}
              max={100}
              step={5}
              disabled={!draft.soundEnabled}
              value={[draft.volume]}
              onValueChange={(v) => set("volume", sliderValue(v))}
            />
            <span className="w-10 shrink-0 text-right font-mono text-sm">
              {draft.volume}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!draft.soundEnabled}
              onClick={playSound}
            >
              <Play />
              ฟัง
            </Button>
          </div>
        </section>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <AlertPreview
        imageUrl={alertImageUrl(media)}
        supportText={draft.supportText.trim() || "โดเนท"}
        nameColor={draft.nameColor}
        durationSec={draft.durationSec}
        onPlay={() => draft.soundEnabled && playSound()}
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

type Phase = "idle" | "in" | "out" | "hidden";

/** พรีวิวขนาดจริง + ปุ่มเล่น animation เข้า/ออกตามระยะเวลาที่ตั้ง (F11) */
function AlertPreview({
  imageUrl,
  supportText,
  nameColor,
  durationSec,
  onPlay,
}: {
  imageUrl: string;
  supportText: string;
  nameColor: string;
  durationSec: number;
  onPlay: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function play() {
    timers.current.forEach(clearTimeout);
    setRun((r) => r + 1);
    setPhase("in");
    onPlay();
    timers.current = [
      window.setTimeout(() => setPhase("out"), durationSec * 1000),
      window.setTimeout(() => setPhase("hidden"), durationSec * 1000 + 500),
      window.setTimeout(() => setPhase("idle"), durationSec * 1000 + 1200),
    ];
  }

  return (
    <section className="min-w-0 rounded-2xl border bg-card p-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between px-2 pb-3">
        <h2 className="font-medium">พรีวิว</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={play}
          disabled={phase !== "idle"}
        >
          <Play />
          เล่นพรีวิว
        </Button>
      </div>
      {/* พื้นลายตารางแทนพื้นโปร่งใสของ OBS */}
      <div
        className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border p-4"
        style={{
          backgroundColor: "#e5e5e5",
          backgroundImage:
            "conic-gradient(#d4d4d4 25%, transparent 0 50%, #d4d4d4 0 75%, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {phase !== "hidden" && (
          <AlertCard
            key={run}
            imageUrl={imageUrl}
            {...SAMPLE}
            supportText={supportText}
            nameColor={nameColor}
            className={cn(
              phase === "in" && "animate-in duration-500 fade-in-0 zoom-in-90",
              phase === "out" &&
                "animate-out duration-500 fade-out-0 fill-mode-forwards zoom-out-90",
            )}
          />
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 px-2">
        <Button variant="outline" size="sm" disabled>
          <Send />
          ทดสอบ alert ใน OBS
        </Button>
        <span className="text-xs text-muted-foreground">
          ใช้ได้หลังทำหน้า overlay · เร็วๆ นี้
        </span>
      </div>
    </section>
  );
}

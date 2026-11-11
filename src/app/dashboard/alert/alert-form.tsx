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
import { GifPicker } from "@/components/gif-picker";
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
import { playSpeech } from "@/lib/speech-player";
import {
  isCloudVoice,
  previewTtsText,
  TTS_MIN_AMOUNT,
  TTS_VOICES,
  type TtsVoice,
} from "@/lib/tts";
import { cn } from "@/lib/utils";

import { UnsavedBar } from "../unsaved-bar";

type Editable = Pick<
  AlertSettings,
  | "durationSec"
  | "soundEnabled"
  | "volume"
  | "supportText"
  | "nameColor"
  | "donorCanPickImage"
  | "donorCanPickColor"
  | "donorCanPickSupportText"
  | "ttsEnabled"
  | "ttsMode"
  | "ttsMinAmountSatang"
  | "ttsVoice"
  | "ttsVolume"
>;

const DONOR_PICKS = [
  {
    key: "donorCanPickImage",
    label: "รูป / GIF",
    hint: "ผู้บริจาคค้นหา GIF จาก KLIPY ได้ (อัปโหลดเองไม่ได้)",
  },
  { key: "donorCanPickColor", label: "สีชื่อ", hint: "เลือกจากวงล้อสี" },
  {
    key: "donorCanPickSupportText",
    label: "คำสนับสนุน",
    hint: "พิมพ์เองได้ไม่เกิน 40 ตัวอักษร",
  },
] as const;
type Media = Pick<AlertSettings, "mediaType" | "mediaUrl">;

const pick = (s: AlertSettings): Editable => ({
  durationSec: s.durationSec,
  soundEnabled: s.soundEnabled,
  volume: s.volume,
  supportText: s.supportText,
  nameColor: s.nameColor,
  donorCanPickImage: s.donorCanPickImage,
  donorCanPickColor: s.donorCanPickColor,
  donorCanPickSupportText: s.donorCanPickSupportText,
  ttsEnabled: s.ttsEnabled,
  ttsMode: s.ttsMode,
  ttsMinAmountSatang: s.ttsMinAmountSatang,
  ttsVoice: s.ttsVoice,
  ttsVolume: s.ttsVolume,
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
                customerKey={userId}
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
          <h2 className="font-medium">ให้ผู้บริจาคเลือกเอง</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เปิดแล้วผู้บริจาคปรับส่วนนี้ได้ในหน้าโดเนท ถ้าไม่เลือกจะใช้ค่าที่คุณตั้งไว้
          </p>
          <ul className="mt-4 divide-y">
            {DONOR_PICKS.map(({ key, label, hint }) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  aria-label={`ให้ผู้บริจาคเลือก${label}`}
                  checked={draft[key]}
                  onCheckedChange={(checked) => set(key, checked)}
                />
              </li>
            ))}
          </ul>
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

        <TtsCard draft={draft} set={set} onError={setError} />

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
      <TestAlertButton />
    </section>
  );
}

/** ส่ง alert ตัวอย่างไป overlay จริงใน OBS (ใช้ค่าที่บันทึกแล้ว) */
function TestAlertButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/alerts/test", { method: "POST" });
      if (!res.ok) {
        setMessage(await readError(res, "ส่งไม่สำเร็จ"));
        setState("idle");
        return;
      }
      setState("sent");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setMessage("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      setState("idle");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 px-2">
      <Button
        variant="outline"
        size="sm"
        disabled={state === "sending"}
        onClick={send}
      >
        {state === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
        ทดสอบ alert ใน OBS
      </Button>
      <span
        role="status"
        className={cn(
          "text-xs",
          message ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {message ??
          (state === "sent"
            ? "ส่งแล้ว ดูที่ OBS ได้เลย"
            : "ใช้ค่าที่บันทึกแล้ว · ใส่ลิงก์ OBS จากหน้าหลักก่อน")}
      </span>
    </div>
  );
}

const TTS_MODES = [
  { value: "message", label: "อ่านเฉพาะข้อความ" },
  { value: "full", label: "อ่านชื่อ ยอด และข้อความ" },
] as const;

/** F13 การ์ดตั้งค่าเสียงอ่านข้อความ (Google TTS) */
function TtsCard({
  draft,
  set,
  onError,
}: {
  draft: Editable;
  set: <K extends keyof Editable>(key: K, value: Editable[K]) => void;
  onError: (message: string | null) => void;
}) {
  const [previewing, setPreviewing] = useState(false);
  const off = !draft.ttsEnabled;

  async function preview() {
    setPreviewing(true);
    onError(null);
    // เสียง Google แปลภาษา: เล่นจากเบราว์เซอร์เลย ไม่ผ่าน server
    if (!isCloudVoice(draft.ttsVoice)) {
      try {
        await playSpeech(
          { text: previewTtsText(draft.ttsMode, draft.supportText) },
          draft.ttsVolume / 100,
        );
      } catch {
        onError("เล่นเสียงอ่านไม่ได้ตอนนี้ (Google แปลภาษาอาจปิดกั้นชั่วคราว)");
      } finally {
        setPreviewing(false);
      }
      return;
    }
    try {
      const res = await fetch("/api/settings/alert/tts-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ttsMode: draft.ttsMode,
          ttsVoice: draft.ttsVoice,
          supportText: draft.supportText,
        }),
      });
      if (!res.ok) {
        onError(await readError(res, "สร้างเสียงอ่านไม่สำเร็จ"));
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.volume = draft.ttsVolume / 100;
      audio.addEventListener("ended", () => URL.revokeObjectURL(url));
      await audio.play().catch(() => {});
    } catch {
      onError("สร้างเสียงอ่านไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">เสียงอ่านข้อความ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            อ่านข้อความของผู้บริจาคออกเสียงบนไลฟ์ หลังเสียงแจ้งเตือน
          </p>
        </div>
        <Switch
          aria-label="เปิดเสียงอ่านข้อความ"
          checked={draft.ttsEnabled}
          onCheckedChange={(checked) => set("ttsEnabled", checked)}
        />
      </div>

      <div className={cn("mt-5 grid gap-5", off && "opacity-50")}>
        <div
          role="radiogroup"
          aria-label="อ่านอะไร"
          className="grid w-full grid-cols-2 rounded-lg border p-0.5 text-sm sm:inline-flex sm:w-fit"
        >
          {TTS_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={draft.ttsMode === m.value}
              disabled={off}
              onClick={() => set("ttsMode", m.value)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                draft.ttsMode === m.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ttsMinAmount">อ่านเมื่อยอดตั้งแต่ (บาท)</Label>
            <Input
              id="ttsMinAmount"
              inputMode="numeric"
              disabled={off}
              className="font-mono"
              value={String(draft.ttsMinAmountSatang / 100)}
              onChange={(e) => {
                // ให้ลบแล้วพิมพ์ใหม่ได้ ค่อยปัดขึ้นขั้นต่ำตอนออกจากช่อง
                const baht = Number(e.target.value.replace(/\D/g, "") || 0);
                set(
                  "ttsMinAmountSatang",
                  Math.min(TTS_MIN_AMOUNT.max, baht * 100),
                );
              }}
              onBlur={() => {
                if (draft.ttsMinAmountSatang < TTS_MIN_AMOUNT.min) {
                  set("ttsMinAmountSatang", TTS_MIN_AMOUNT.min);
                }
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ttsVoice">เสียง</Label>
            <select
              id="ttsVoice"
              disabled={off}
              value={draft.ttsVoice}
              onChange={(e) => set("ttsVoice", e.target.value as TtsVoice)}
              className="h-8 rounded-lg border bg-background px-2.5 text-sm"
            >
              {TTS_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Volume2
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Slider
            thumbLabel="ระดับเสียงอ่าน"
            min={0}
            max={100}
            step={5}
            disabled={off}
            value={[draft.ttsVolume]}
            onValueChange={(v) => set("ttsVolume", sliderValue(v))}
          />
          <span className="w-10 shrink-0 text-right font-mono text-sm">
            {draft.ttsVolume}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={off || previewing}
            onClick={preview}
          >
            {previewing ? <Loader2 className="animate-spin" /> : <Play />}
            ฟังตัวอย่าง
          </Button>
        </div>
      </div>
    </section>
  );
}

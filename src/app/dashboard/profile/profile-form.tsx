"use client";

import {
  Check,
  CircleUserRound,
  Eye,
  IdCard,
  ImageUp,
  Link2,
  Loader2,
  Lock,
  GalleryHorizontal,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SectionCard } from "@/components/dashboard/section-card";
import { ProfileCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  type ProfileImageKind,
} from "@/lib/profile";
import { checkUsername } from "@/lib/username";
import type { ProfileSettings } from "@/server/services/profile";

import { UnsavedBar } from "../unsaved-bar";

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return (body?.error?.message as string | undefined) ?? fallback;
}

export function ProfileForm({
  initial,
  siteUrl,
}: {
  initial: ProfileSettings;
  siteUrl: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [draft, setDraft] = useState({
    displayName: initial.displayName,
    bio: initial.bio ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = { displayName: profile.displayName, bio: profile.bio ?? "" };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        setError(await readError(res, "บันทึกไม่สำเร็จ"));
        return;
      }
      const next: ProfileSettings = await res.json();
      setProfile(next);
      setDraft({ displayName: next.displayName, bio: next.bio ?? "" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex flex-col gap-4">
        <ImageCard
          kind="avatar"
          title="รูปโปรไฟล์"
          hint="รูปสี่เหลี่ยมจัตุรัส แสดงเป็นวงกลม · ไม่เกิน 4 MB"
          url={profile.avatarUrl}
          onChange={setProfile}
          onError={setError}
        />
        <ImageCard
          kind="banner"
          title="แบนเนอร์"
          hint="แสดงบนสุดของหน้าโดเนท อัตราส่วน 3:1 (เช่น 1500 × 500) · ไม่เกิน 4 MB"
          url={profile.bannerUrl}
          onChange={setProfile}
          onError={setError}
        />

        <SectionCard
          icon={IdCard}
          title="ชื่อและแนะนำตัว"
          description="แสดงบนหน้าโดเนทให้ผู้ชมเห็น"
        >
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="displayName">ชื่อที่แสดง</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {draft.displayName.length}/{DISPLAY_NAME_MAX}
              </span>
            </div>
            <Input
              id="displayName"
              maxLength={DISPLAY_NAME_MAX}
              value={draft.displayName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, displayName: e.target.value }))
              }
            />
          </div>
          <div className="mt-4 grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="bio">แนะนำตัว</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {draft.bio.length}/{BIO_MAX}
              </span>
            </div>
            <Textarea
              id="bio"
              maxLength={BIO_MAX}
              placeholder="เช่น สตรีมเกมทุกคืน 2 ทุ่ม ขอบคุณทุกกำลังใจนะ"
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
            />
          </div>
        </SectionCard>

        <UsernameCard current={profile.username ?? ""} siteUrl={siteUrl} />

        <SectionCard
          icon={Lock}
          title="ชื่อจริง"
          description="ได้มาจากบัญชี Google/Discord ที่ใช้ล็อกอิน — ไม่แสดงบนหน้าโดเนท"
        >
          <p
            data-testid="real-name"
            className="rounded-lg border bg-muted/50 px-3 py-2 text-sm"
          >
            {profile.realName || "–"}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            รหัสผู้ใช้ (ใช้ตั้งสิทธิ์แอดมิน):{" "}
            <code
              data-testid="user-id"
              className="font-mono break-all select-all"
            >
              {profile.id}
            </code>
          </p>
        </SectionCard>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-20">
        <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="size-4" aria-hidden />
          พรีวิวบนหน้าโดเนท
        </p>
        <ProfileCard
          showFeatures={false}
          profile={{
            displayName: draft.displayName.trim() || profile.username || "",
            username: profile.username ?? "",
            avatarUrl: profile.avatarUrl,
            bannerUrl: profile.bannerUrl,
            bio: draft.bio.trim() || null,
          }}
        />
      </div>

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

function ImageCard({
  kind,
  title,
  hint,
  url,
  onChange,
  onError,
}: {
  kind: ProfileImageKind;
  title: string;
  hint: string;
  url: string | null;
  onChange: (p: ProfileSettings) => void;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function send(method: "POST" | "DELETE", file?: File) {
    setBusy(method === "POST" ? "upload" : "remove");
    onError(null);
    try {
      let body: FormData | undefined;
      if (file) {
        body = new FormData();
        body.append("file", file);
      }
      const res = await fetch(`/api/me/profile/${kind}`, { method, body });
      if (!res.ok) {
        onError(await readError(res, "บันทึกรูปไม่สำเร็จ"));
        return;
      }
      onChange(await res.json());
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <SectionCard
      icon={kind === "avatar" ? CircleUserRound : GalleryHorizontal}
      title={title}
      description={hint}
    >
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        aria-label={`เลือกไฟล์${title}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) {
            onError("ไฟล์ต้องไม่เกิน 4 MB");
            return;
          }
          send("POST", file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => input.current?.click()}
        >
          {busy === "upload" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ImageUp />
          )}
          {url ? `เปลี่ยน${title}` : `อัปโหลด${title}`}
        </Button>
        {url && (
          <Button
            variant="ghost"
            disabled={busy !== null}
            onClick={() => send("DELETE")}
          >
            {busy === "remove" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            ลบ
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

type Availability = "idle" | "checking" | "available" | "taken";

/** เปลี่ยนลิงก์โดเนท (username) — ลิงก์เก่าใช้ไม่ได้ทันที */
function UsernameCard({
  current,
  siteUrl,
}: {
  current: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const check = checkUsername(value);
  const changed = check.ok && check.username !== current;
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  useEffect(() => {
    if (!check.ok || !changed) return;
    const username = check.username;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAvailability("checking");
      try {
        const res = await fetch(
          `/api/usernames/check?u=${encodeURIComponent(username)}`,
          {
            signal: controller.signal,
          },
        );
        setAvailability((await res.json()).available ? "available" : "taken");
      } catch {
        if (!controller.signal.aborted) setAvailability("idle");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- เช็กตามชื่อที่พิมพ์
  }, [value]);

  async function save() {
    if (!check.ok) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/me/username", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: check.username }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage({ ok: false, text: await readError(res, "เปลี่ยนไม่สำเร็จ") });
      return;
    }
    setMessage({ ok: true, text: "เปลี่ยนลิงก์แล้ว" });
    router.refresh();
  }

  return (
    <SectionCard
      icon={Link2}
      title="ลิงก์โดเนท"
      description="เปลี่ยนชื่อในลิงก์ที่แชร์ให้ผู้ชม"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="username">ชื่อในลิงก์</Label>
        <div className="flex items-center rounded-lg border bg-background pl-3 text-sm focus-within:ring-3 focus-within:ring-ring/50">
          <span className="shrink-0 text-muted-foreground">{host}/</span>
          <input
            id="username"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setAvailability("idle");
              setMessage(null);
            }}
            className="h-8 min-w-0 flex-1 bg-transparent px-1 outline-none"
          />
          <span className="flex w-8 shrink-0 justify-center" aria-live="polite">
            {changed && availability === "checking" && (
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-label="กำลังเช็ก"
              />
            )}
            {changed && availability === "available" && (
              <Check className="size-4 text-green-600" aria-label="ใช้ได้" />
            )}
            {changed && availability === "taken" && (
              <X className="size-4 text-destructive" aria-label="มีคนใช้แล้ว" />
            )}
          </span>
        </div>
        {!check.ok && value && (
          <p className="text-sm text-destructive">{check.message}</p>
        )}
        {changed && availability === "taken" && (
          <p className="text-sm text-destructive">ชื่อนี้มีคนใช้แล้ว</p>
        )}
      </div>
      {changed && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-1.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            ลิงก์เก่า {host}/{current} จะใช้ไม่ได้ทันที ต้องแชร์ลิงก์ใหม่ให้ผู้ชม
          </p>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || availability !== "available"}
          >
            {saving && <Loader2 className="animate-spin" />}
            เปลี่ยนลิงก์
          </Button>
        </div>
      )}
      {message && (
        <p
          role="status"
          className={
            message.ok
              ? "mt-2 text-sm text-green-700"
              : "mt-2 text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      )}
    </SectionCard>
  );
}

"use client";

import { Loader2, MonitorPlay, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ObsUrlField } from "@/components/dashboard/obs-url-field";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ObsLinkCard({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/overlay/regenerate", {
        method: "POST",
      });
      if (!res.ok) throw new Error(String(res.status));
      setUrl((await res.json()).overlayUrl);
      setConfirmOpen(false);
    } catch {
      setError("สร้างลิงก์ใหม่ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <SectionCard
      id="obs"
      icon={MonitorPlay}
      title="ลิงก์ OBS"
      description="ใส่ใน OBS เพื่อให้ alert ขึ้นจอไลฟ์ — ห้ามเปิดลิงก์นี้ให้ผู้ชมเห็น"
    >
      <ObsUrlField url={url} testId="overlay-url" />
      <Button
        variant="ghost"
        className="mt-2"
        onClick={() => setConfirmOpen(true)}
      >
        <RefreshCw />
        สร้างลิงก์ใหม่
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>ใน OBS กด + ที่ Sources แล้วเลือก Browser</li>
        <li>วางลิงก์ในช่อง URL ตั้งความกว้าง 800 สูง 600</li>
        <li>
          ไปที่หน้า{" "}
          <Link
            href="/dashboard/alert"
            className="underline underline-offset-2"
          >
            ตั้งค่า alert
          </Link>{" "}
          แล้วกด &ldquo;ทดสอบ alert ใน OBS&rdquo;
        </li>
      </ol>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างลิงก์ OBS ใหม่?</DialogTitle>
            <DialogDescription>
              ลิงก์เดิมจะใช้ไม่ได้ทันที ต้องเอาลิงก์ใหม่ไปใส่ใน OBS อีกครั้ง
              ใช้เมื่อลิงก์เดิมหลุดไปให้คนอื่นเห็น
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={regenerating}
            >
              ยกเลิก
            </Button>
            <Button onClick={regenerate} disabled={regenerating}>
              {regenerating && <Loader2 className="animate-spin" />}
              สร้างลิงก์ใหม่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

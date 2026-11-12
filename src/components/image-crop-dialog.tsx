"use client";

import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { SegmentedControl } from "@/components/dashboard/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cropImageToFile, type CropPreset } from "@/lib/crop-image";

type AspectChoice = "free" | "square" | "wide";
const ASPECT_OPTIONS: { value: AspectChoice; label: string }[] = [
  { value: "free", label: "อิสระ" },
  { value: "square", label: "1:1" },
  { value: "wide", label: "16:9" },
];

/**
 * หน้าต่างครอปรูปก่อนอัปโหลด: ลาก/ซูม (pinch บนมือถือ) แล้วกด "ใช้รูปนี้"
 * preset ที่ไม่กำหนด aspect = ให้เลือก อิสระ / 1:1 / 16:9
 */
export function ImageCropDialog({
  file,
  preset,
  title,
  onCancel,
  onConfirm,
  onUnreadable,
}: {
  /** null = ปิดหน้าต่าง */
  file: File | null;
  preset: CropPreset;
  title: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
  /** เบราว์เซอร์เปิดรูปไม่ได้ (ไฟล์เสีย/ปลอมนามสกุล) — ส่งไฟล์เดิมให้ server ตอบ error */
  onUnreadable: (original: File) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<number | undefined>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [choice, setChoice] = useState<AspectChoice>("free");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // เริ่มใหม่ทุกครั้งที่เปิดไฟล์ใหม่
    /* eslint-disable react-hooks/set-state-in-effect */
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setChoice("free");
    setError(null);
    setNatural(undefined);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choosable = preset.aspect === undefined;
  const aspect = !choosable
    ? preset.aspect
    : choice === "square"
      ? 1
      : choice === "wide"
        ? 16 / 9
        : natural;

  async function confirm() {
    if (!file || !area) return;
    setBusy(true);
    setError(null);
    try {
      onConfirm(await cropImageToFile(file, area, preset, "cropped"));
    } catch {
      setError("ครอปรูปไม่สำเร็จ ลองไฟล์อื่น");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={file !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>ลากเพื่อเลื่อน ซูมเพื่อเลือกส่วนที่ต้องการ</DialogDescription>
        </DialogHeader>

        {choosable && (
          <SegmentedControl
            label="สัดส่วน"
            fullWidth
            options={ASPECT_OPTIONS}
            value={choice}
            onChange={setChoice}
          />
        )}

        <div
          data-testid="crop-area"
          className="relative h-72 overflow-hidden rounded-lg bg-neutral-900 sm:h-80"
        >
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect ?? 1}
              cropShape={preset.round ? "round" : "rect"}
              showGrid={!preset.round}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              mediaProps={{
                onError: () => file && onUnreadable(file),
              }}
              onMediaLoaded={({ naturalWidth, naturalHeight }) =>
                setNatural(naturalWidth / naturalHeight)
              }
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomOut
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Slider
            thumbLabel="ซูม"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(v) => setZoom(Array.isArray(v) ? v[0] : v)}
          />
          <ZoomIn
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button disabled={busy || !area} onClick={confirm}>
            {busy && <Loader2 className="animate-spin" />}
            ใช้รูปนี้
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

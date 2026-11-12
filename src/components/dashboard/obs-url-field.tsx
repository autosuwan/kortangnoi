import { CopyButton } from "@/components/dashboard/copy-button";
import { cn } from "@/lib/utils";

/** ซ่อน token ส่วนใหญ่ — ลิงก์ overlay ห้ามขึ้นจอไลฟ์ */
export function maskOverlayUrl(url: string) {
  return url.replace(
    /\/overlay\/([^/]{4})[^/]*/,
    (_, head: string) => `/overlay/${head}${"•".repeat(6)}`,
  );
}

/**
 * ช่องลิงก์ OBS มาตรฐาน: ลิงก์แบบซ่อน token (ตัดด้วย … ไม่ล้นการ์ด) + ปุ่มคัดลอก
 * + ขนาด Browser Source ที่แนะนำ
 */
export function ObsUrlField({
  url,
  size,
  testId,
  copyLabel,
  className,
}: {
  url: string;
  size?: { width: number; height: number };
  testId?: string;
  /** ชื่อปุ่มสำหรับ screen reader (มีหลายช่องในหน้าเดียว) */
  copyLabel?: string;
  className?: string;
}) {
  const masked = maskOverlayUrl(url).replace(/^https?:\/\//, "");
  const cut = masked.indexOf("/overlay/");
  const host = cut >= 0 ? masked.slice(0, cut) : masked;
  const path = cut >= 0 ? masked.slice(cut) : "";
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {/* host ตัดด้วย … ได้ แต่ path (/overlay/xxxx••••/goal) ต้องเห็นเสมอ */}
        <p
          data-testid={testId}
          title="ลิงก์ถูกซ่อนบางส่วน กดคัดลอกเพื่อใช้ลิงก์เต็ม"
          className="flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-lg border bg-background px-3 font-mono text-sm whitespace-nowrap"
        >
          <span className="min-w-0 truncate text-muted-foreground">{host}</span>
          <span className="shrink-0">{path}</span>
        </p>
        <CopyButton
          text={url}
          ariaLabel={copyLabel}
          size="lg"
          className="shrink-0"
        />
      </div>
      {size && (
        <p className="text-xs text-muted-foreground">
          OBS → Sources → + → Browser · กว้าง{" "}
          <span className="font-mono">{size.width}</span> สูง{" "}
          <span className="font-mono">{size.height}</span>
        </p>
      )}
    </div>
  );
}

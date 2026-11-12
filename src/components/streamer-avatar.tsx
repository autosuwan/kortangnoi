import { initialOf } from "@/lib/profile";
import { cn } from "@/lib/utils";

/** รูปโปรไฟล์สตรีมเมอร์ — ไม่มีรูปใช้ตัวอักษรแรกบนพื้นส้ม */
export function StreamerAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-medium text-primary-foreground ring-4 ring-card",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage ขนาดไม่แน่นอน
        <img
          src={url}
          alt=""
          data-testid="streamer-avatar"
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden className="text-[length:inherit]">
          {initialOf(name)}
        </span>
      )}
    </span>
  );
}

/** แบนเนอร์ 3:1 — ไม่มีรูปใช้ gradient ส้มของเว็บ */
export function StreamerBanner({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "aspect-[3/1] w-full overflow-hidden bg-gradient-to-br from-primary/80 via-orange-300 to-rose-300",
        className,
      )}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage ขนาดไม่แน่นอน
        <img
          src={url}
          alt=""
          data-testid="streamer-banner"
          className="size-full object-cover"
        />
      )}
    </div>
  );
}

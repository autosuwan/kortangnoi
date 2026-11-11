import Image from "next/image";

import { cn } from "@/lib/utils";

/** โลโก้แนวนอน (แมวกวัก + kortangnoi + ขอตังค์หน่อย) ไฟล์จริง 828×240 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="KORTANGNOI ขอตังค์หน่อย"
      width={828}
      height={240}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}

/** ไอคอนแมวกวักบนพื้นส้ม ใช้ในที่แคบ เช่น sidebar */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={96}
      height={96}
      className={cn("size-8 rounded-lg", className)}
    />
  );
}

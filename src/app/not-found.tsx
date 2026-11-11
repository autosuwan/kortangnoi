import Link from "next/link";

import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="app-bg flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Logo className="h-10" />
      <h1 className="text-xl font-medium">ไม่พบหน้านี้</h1>
      <p className="text-sm text-muted-foreground">
        ลิงก์อาจพิมพ์ผิด หรือสตรีมเมอร์เปลี่ยนชื่อลิงก์แล้ว
      </p>
      <Link href="/" className="text-sm underline underline-offset-2">
        กลับหน้าแรก
      </Link>
    </main>
  );
}

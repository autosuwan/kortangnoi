import { SearchX } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="app-bg flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border bg-card p-8 text-center">
        <Link href="/" aria-label="KORTANGNOI หน้าแรก">
          <Logo className="h-10" />
        </Link>
        <span className="mt-8 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchX className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-medium">ไม่พบหน้านี้</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ลิงก์อาจพิมพ์ผิด หรือสตรีมเมอร์เปลี่ยนชื่อลิงก์แล้ว
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
        >
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}

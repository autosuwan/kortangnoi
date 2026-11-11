import { BadgePercent, HandCoins, MonitorPlay, ScanLine } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BadgePercent,
    title: "ไม่มีค่าธรรมเนียม",
    body: (
      <>
        เงินโอน<span className="text-foreground">ตรงเข้าพร้อมเพย์ของคุณ</span>{" "}
        ไม่ผ่านตัวกลาง ไม่หักเปอร์เซ็นต์
      </>
    ),
    detail: "0%",
  },
  {
    icon: ScanLine,
    title: "ตรวจสลิปอัตโนมัติ",
    body: (
      <>
        เช็กยอด ผู้รับ และ<span className="text-foreground">สลิปซ้ำ</span>{" "}
        กับข้อมูลธนาคารจริง ภายในไม่กี่วินาที
      </>
    ),
    detail: "transRef ✓ amount ✓",
  },
  {
    icon: MonitorPlay,
    title: "ขึ้นจอ OBS ทันที",
    body: (
      <>
        ใส่ลิงก์เดียวใน <span className="text-foreground">Browser Source</span> พร้อม
        GIF ชื่อ ยอด และข้อความ
      </>
    ),
    detail: "/overlay/••••••••",
  },
];

export default function Home() {
  return (
    <div className="app-bg flex flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <HandCoins className="size-5 text-primary" aria-hidden />
            KORTANGNOI
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "sm" }), "px-3")}
          >
            เข้าสู่ระบบ
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:py-24">
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
              รับโดเนทผ่านพร้อมเพย์
              <span className="block text-primary">ขึ้นจอไลฟ์อัตโนมัติ</span>
            </h1>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "px-4")}
              >
                เริ่มต้นใช้งาน
              </Link>
              <a
                href="#features"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "px-4",
                )}
              >
                ดูว่าทำงานยังไง
              </a>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            สร้างลิงก์โดเนทของคุณ ผู้ชมสแกน QR โอนเงิน แนบสลิป แล้ว
            <span className="text-foreground"> alert ขึ้นบน OBS </span>
            ภายในไม่กี่วินาที ใช้ได้กับ Twitch, YouTube และ TikTok Live
          </p>
        </section>

        <section
          id="features"
          className="mt-16 grid gap-4 sm:mt-24 md:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, body, detail }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl border bg-card p-6"
            >
              <h2 className="flex items-center gap-2 font-medium">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                {title}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">{body}</p>
              <code className="mt-8 self-start rounded-md border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                {detail}
              </code>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
          KORTANGNOI · ใช้ฟรีในกลุ่มเพื่อน
        </div>
      </footer>
    </div>
  );
}

import {
  ArrowRight,
  BadgePercent,
  Link2,
  MonitorPlay,
  QrCode,
  ScanLine,
} from "lucide-react";
import Link from "next/link";

import { AlertCard } from "@/components/alert-card";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { DEFAULT_ALERT_IMAGE } from "@/lib/alert-settings";
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

const steps = [
  {
    icon: Link2,
    title: "ตั้งลิงก์โดเนท",
    body: "ล็อกอินด้วย Google หรือ Discord ใส่เบอร์พร้อมเพย์ ได้ลิงก์ของคุณทันที",
  },
  {
    icon: QrCode,
    title: "ผู้ชมสแกนจ่าย + แนบสลิป",
    body: "QR ล็อกยอดให้ โอนจากแอปธนาคารไหนก็ได้ แล้วแนบสลิปในหน้าเดิม",
  },
  {
    icon: MonitorPlay,
    title: "alert ขึ้นจอไลฟ์",
    body: "ระบบตรวจสลิปกับธนาคารจริง ผ่านแล้ว alert เด้งบน OBS พร้อมเสียงอ่าน",
  },
];

export default function Home() {
  return (
    <div className="app-bg flex flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="KORTANGNOI หน้าแรก">
            <Logo />
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
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Twitch · YouTube · TikTok Live
            </span>
            <h1 className="mt-4 text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
              รับโดเนทผ่านพร้อมเพย์
              <span className="block text-primary">ขึ้นจอไลฟ์อัตโนมัติ</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              สร้างลิงก์โดเนทของคุณ ผู้ชมสแกน QR โอนเงิน แนบสลิป แล้ว
              <span className="text-foreground"> alert ขึ้นบน OBS </span>
              ภายในไม่กี่วินาที
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "px-4")}
              >
                เริ่มต้นใช้งาน
              </Link>
              <a
                href="#how"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "px-4",
                )}
              >
                ดูว่าทำงานยังไง
              </a>
            </div>
          </div>

          <figure className="rounded-2xl border bg-card p-3">
            <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-obs-checker p-4">
              <AlertCard
                imageUrl={DEFAULT_ALERT_IMAGE}
                donorName="ผู้ชมใจดี"
                supportText="ให้ค่าข้าว"
                amountSatang={10000}
                message="สู้ๆ นะ ไลฟ์สนุกมาก"
                nameColor="#FACC15"
              />
            </div>
            <figcaption className="px-2 pt-3 pb-1 text-xs text-muted-foreground">
              ตัวอย่าง alert บน OBS — ปรับรูป สี และข้อความได้เอง
            </figcaption>
          </figure>
        </section>

        <section
          id="features"
          aria-label="จุดเด่น"
          className="mt-16 grid gap-4 sm:mt-24 md:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, body, detail }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl border bg-card p-6"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <h2 className="mt-4 font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              <code className="mt-6 self-start rounded-md border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                {detail}
              </code>
            </article>
          ))}
        </section>

        <section id="how" className="mt-16 scroll-mt-20 sm:mt-24">
          <h2 className="text-2xl font-medium">ใช้งาน 3 ขั้น</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ตั้งค่าครั้งเดียว ใช้ได้ทุกไลฟ์
          </p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground">
                    {i + 1}
                  </span>
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:mt-24 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-medium">พร้อมรับโดเนทแล้วหรือยัง?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ฟรี ไม่หักค่าธรรมเนียม ตั้งค่าเสร็จในไม่กี่นาที
            </p>
          </div>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "lg" }), "px-4")}
          >
            สร้างลิงก์โดเนทฟรี
            <ArrowRight />
          </Link>
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

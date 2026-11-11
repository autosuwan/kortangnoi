import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Mono, Noto_Sans_Thai } from "next/font/google";

import { Suspense } from "react";

import { TopProgressBar } from "@/components/top-progress-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { publicEnv } from "@/lib/env";

import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: "KORTANGNOI",
  description: "รับโดเนทผ่านพร้อมเพย์ ไม่มีค่าธรรมเนียม ขึ้นจอ OBS อัตโนมัติ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSans.variable} ${notoSansThai.variable} ${notoSansMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* useSearchParams ต้องอยู่ใน Suspense (Cache Components) */}
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

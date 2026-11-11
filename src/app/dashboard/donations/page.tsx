import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "../page-header";
import { DonationsView } from "./donations-view";

export const metadata: Metadata = { title: "ประวัติโดเนท · KORTANGNOI" };

export default function DonationsPage() {
  return (
    <>
      <PageHeader title="ประวัติโดเนท" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-medium">ประวัติโดเนท</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          กดรายการเพื่อดูสลิป และอนุมัติรายการที่รอตรวจ
        </p>
        {/* useSearchParams ต้องอยู่ใน Suspense; สิทธิ์ตรวจที่ API (requireUser ใน route) */}
        <Suspense fallback={null}>
          <DonationsView />
        </Suspense>
      </main>
    </>
  );
}

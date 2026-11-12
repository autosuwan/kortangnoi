import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTitle } from "@/components/dashboard/page-title";

import { PageHeader } from "../page-header";
import { DonationsView } from "./donations-view";

export const metadata: Metadata = { title: "ประวัติโดเนท · KORTANGNOI" };

export default function DonationsPage() {
  return (
    <>
      <PageHeader title="ประวัติโดเนท" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <PageTitle
          title="ประวัติโดเนท"
          description="กดรายการเพื่อดูสลิป และอนุมัติรายการที่รอตรวจ"
        />
        {/* useSearchParams ต้องอยู่ใน Suspense; สิทธิ์ตรวจที่ API (requireUser ใน route) */}
        <Suspense fallback={null}>
          <DonationsView />
        </Suspense>
      </main>
    </>
  );
}

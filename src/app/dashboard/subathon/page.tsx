import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageTitle } from "@/components/dashboard/page-title";
import { requireUser } from "@/server/auth";
import { getOverlayToken } from "@/server/realtime/overlay";
import { overlayUrl } from "@/server/services/overlay";
import {
  getOverlayWidgetSettings,
  getTimer,
} from "@/server/services/overlay-widgets";
import { getMe } from "@/server/services/profile";
import { listRoundDonations } from "@/server/services/streamer-donations";

import { PageHeader } from "../page-header";
import { AlertFormSkeleton } from "../skeletons";
import { SubathonView } from "./subathon-view";

export const metadata: Metadata = { title: "Subathon · KORTANGNOI" };

export default function SubathonPage() {
  return (
    <>
      <PageHeader title="Subathon" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <PageTitle
          title="Subathon"
          description="นับถอยหลังบนจอไลฟ์ — คุมเวลา ดูโดเนทที่บวก/ลด และตั้งกฎได้ในหน้านี้"
        />
        <Suspense fallback={<AlertFormSkeleton />}>
          <Loaded />
        </Suspense>
      </main>
    </>
  );
}

async function Loaded() {
  const user = await requireUser();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");
  const token = await getOverlayToken(user.id);
  if (!token) redirect("/dashboard");

  const [settings, timer, round] = await Promise.all([
    getOverlayWidgetSettings(user.id),
    getTimer(user.id),
    listRoundDonations(user.id, "all"),
  ]);
  return (
    <SubathonView
      initialSettings={settings}
      initialTimer={timer}
      initialRound={round}
      obsUrl={`${overlayUrl(token)}/timer`}
    />
  );
}

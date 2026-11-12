import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageTitle } from "@/components/dashboard/page-title";
import { requireUser } from "@/server/auth";
import { getOverlayToken } from "@/server/realtime/overlay";
import { overlayUrl } from "@/server/services/overlay";
import {
  getOverlayWidgetSettings,
  getWidgetData,
} from "@/server/services/overlay-widgets";
import { getMe } from "@/server/services/profile";

import { PageHeader } from "../page-header";
import { AlertFormSkeleton } from "../skeletons";
import { OverlaysForm } from "./overlays-form";

export const metadata: Metadata = { title: "Overlay · KORTANGNOI" };

export default function OverlaysPage() {
  return (
    <>
      <PageHeader title="Overlay" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <PageTitle
          title="Overlay"
          description="ของแต่งจอไลฟ์เพิ่มจาก alert — แต่ละอันใส่ใน OBS เป็น Browser Source แยกกัน"
        />
        <Suspense fallback={<AlertFormSkeleton />}>
          <LoadedForm />
        </Suspense>
      </main>
    </>
  );
}

async function LoadedForm() {
  const user = await requireUser();
  const me = await getMe(user.id);
  if (!me.username) redirect("/onboarding");
  const token = await getOverlayToken(user.id);
  if (!token) redirect("/dashboard");

  const [settings, goal, qr, top, recent, timer, avatar] = await Promise.all([
    getOverlayWidgetSettings(user.id),
    getWidgetData(token, "goal"),
    getWidgetData(token, "qr"),
    getWidgetData(token, "top"),
    getWidgetData(token, "recent"),
    getWidgetData(token, "timer"),
    getWidgetData(token, "avatar"),
  ]);

  return (
    <OverlaysForm
      initial={settings}
      baseUrl={overlayUrl(token)}
      data={{ goal, qr, top, recent, timer, avatar }}
    />
  );
}

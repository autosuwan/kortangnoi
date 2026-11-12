import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getPublicStreamer } from "@/server/services/donation";

import { DonateForm } from "./donate-form";
import { DonateShell } from "./donate-shell";

export const metadata: Metadata = { title: "โดเนท · KORTANGNOI" };

export default function DonatePage({ params }: PageProps<"/[username]">) {
  return (
    <Suspense fallback={<DonateSkeleton />}>
      <LoadedDonatePage params={params} />
    </Suspense>
  );
}

async function LoadedDonatePage({
  params,
}: {
  params: PageProps<"/[username]">["params"];
}) {
  const { username } = await params;
  const streamer = await getPublicStreamer(decodeURIComponent(username));
  if (!streamer) notFound();

  return (
    <DonateShell streamer={streamer} step={1}>
      {streamer.enabled ? (
        <DonateForm streamer={streamer} />
      ) : (
        <p role="status" className="py-6 text-center text-muted-foreground">
          ตอนนี้ปิดรับโดเนท
        </p>
      )}
    </DonateShell>
  );
}

function DonateSkeleton() {
  return (
    <main
      role="status"
      aria-label="กำลังโหลด"
      className="app-bg flex flex-1 justify-center px-4 py-8"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card p-6">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="mt-2 h-7 w-40" />
        <Skeleton className="mt-4 h-5 w-64" />
        <Skeleton className="mt-8 h-8 w-full rounded-lg" />
        <Skeleton className="mt-4 h-8 w-full rounded-lg" />
        <Skeleton className="mt-4 h-20 w-full rounded-lg" />
        <Skeleton className="mt-6 h-10 w-full rounded-lg" />
      </div>
    </main>
  );
}

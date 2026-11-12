import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { publicEnv } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { getProfileSettings } from "@/server/services/profile";

import { PageHeader } from "../page-header";
import { AlertFormSkeleton } from "../skeletons";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "โปรไฟล์ · KORTANGNOI" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="โปรไฟล์" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-medium">โปรไฟล์</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          รูป แบนเนอร์ และชื่อที่ผู้ชมเห็นบนหน้าโดเนท
        </p>
        <Suspense fallback={<AlertFormSkeleton />}>
          <LoadedProfile />
        </Suspense>
      </main>
    </>
  );
}

async function LoadedProfile() {
  const user = await requireUser();
  const profile = await getProfileSettings(user.id);
  if (!profile.username) redirect("/onboarding");
  return <ProfileForm initial={profile} siteUrl={publicEnv.siteUrl} />;
}

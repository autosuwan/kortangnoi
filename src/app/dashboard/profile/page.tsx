import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageTitle } from "@/components/dashboard/page-title";
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <PageTitle
          title="โปรไฟล์"
          description="รูป แบนเนอร์ และชื่อที่ผู้ชมเห็นบนหน้าโดเนท"
        />
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

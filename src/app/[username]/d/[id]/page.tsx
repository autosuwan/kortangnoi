import type { Metadata } from "next";
import { Suspense } from "react";

import { DonationStatus } from "./donation-status";

export const metadata: Metadata = {
  title: "สแกนจ่าย · KORTANGNOI",
  robots: { index: false, follow: false },
};

// token อยู่ใน ?t= (อ่านใน client ด้วย useSearchParams ต้องอยู่ใน Suspense)
export default function DonationPage({
  params,
}: PageProps<"/[username]/d/[id]">) {
  return (
    <Suspense fallback={null}>
      <Loaded params={params} />
    </Suspense>
  );
}

async function Loaded({
  params,
}: {
  params: PageProps<"/[username]/d/[id]">["params"];
}) {
  const { id } = await params;
  return <DonationStatus id={id} />;
}

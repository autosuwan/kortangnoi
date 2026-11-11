import { Suspense } from "react";

import { Overlay } from "./overlay";

// อ่าน params ใน <Suspense> ตามข้อกำหนด Cache Components
export default function OverlayPage({ params }: PageProps<"/overlay/[token]">) {
  return (
    <Suspense fallback={null}>
      <OverlayFromParams params={params} />
    </Suspense>
  );
}

async function OverlayFromParams({
  params,
}: {
  params: PageProps<"/overlay/[token]">["params"];
}) {
  const { token } = await params;
  return <Overlay token={token} />;
}

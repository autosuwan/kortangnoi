import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WIDGET_KINDS, type WidgetKind } from "@/lib/overlay-widgets";

import { WidgetOverlay } from "./widget-overlay";

// F14: /overlay/{token}/goal|qr|top|recent — อ่าน params ใน <Suspense> (Cache Components)
export default function WidgetPage({
  params,
}: PageProps<"/overlay/[token]/[widget]">) {
  return (
    <Suspense fallback={null}>
      <WidgetFromParams params={params} />
    </Suspense>
  );
}

async function WidgetFromParams({
  params,
}: {
  params: PageProps<"/overlay/[token]/[widget]">["params"];
}) {
  const { token, widget } = await params;
  if (!WIDGET_KINDS.includes(widget as WidgetKind)) notFound();
  return <WidgetOverlay token={token} kind={widget as WidgetKind} />;
}

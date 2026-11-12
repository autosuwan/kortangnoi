import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import { WIDGET_KINDS, type WidgetKind } from "@/lib/overlay-widgets";
import { getWidgetData } from "@/server/services/overlay-widgets";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/overlay/[token]/widgets/[kind]">,
) {
  const { token, kind } = await ctx.params;
  if (!WIDGET_KINDS.includes(kind as WidgetKind)) {
    return errorResponse(404, "NOT_FOUND", "ไม่พบ widget");
  }
  try {
    const data = await getWidgetData(token, kind as WidgetKind);
    return NextResponse.json(data, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

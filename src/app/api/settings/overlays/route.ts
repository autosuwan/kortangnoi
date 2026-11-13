import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import {
  getOverlayWidgetSettings,
  updateOverlayWidgetSettings,
} from "@/server/services/overlay-widgets";

export async function GET() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    return NextResponse.json(await getOverlayWidgetSettings(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

// validate (Zod) อยู่ใน service
export async function PUT(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await updateOverlayWidgetSettings(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

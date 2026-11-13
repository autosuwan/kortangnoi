import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { controlTimer, getTimer } from "@/server/services/overlay-widgets";

export async function GET() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    return NextResponse.json(await getTimer(user.id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// { action: start|pause|resume|reset } หรือ { action: "adjust", seconds } — validate ใน service
export async function POST(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await controlTimer(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

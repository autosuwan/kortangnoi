import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import { getPublicStreamer } from "@/server/services/donation";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/public/[username]">,
) {
  const { username } = await params;
  try {
    const streamer = await getPublicStreamer(username);
    if (!streamer) return errorResponse(404, "NOT_FOUND", "ไม่พบหน้านี้");
    return NextResponse.json(streamer);
  } catch (error) {
    return toErrorResponse(error);
  }
}

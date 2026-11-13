import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { getDonationDetail } from "@/server/services/streamer-donations";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]">,
) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  const { id } = await params;
  try {
    return NextResponse.json(await getDonationDetail(user.id, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

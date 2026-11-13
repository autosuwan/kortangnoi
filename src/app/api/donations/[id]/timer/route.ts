import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { applyDonationTimer } from "@/server/services/streamer-donations";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]/timer">,
) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  const { id } = await params;
  try {
    return NextResponse.json(await applyDonationTimer(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { applyDonationTimer } from "@/server/services/streamer-donations";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]/timer">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    return NextResponse.json(await applyDonationTimer(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

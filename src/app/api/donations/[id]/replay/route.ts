import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { replayDonationAlert } from "@/server/services/overlay";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]/replay">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    return NextResponse.json(await replayDonationAlert(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { approveDonation } from "@/server/services/streamer-donations";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]/approve">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    return NextResponse.json(await approveDonation(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

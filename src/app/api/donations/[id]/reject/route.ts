import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { rejectDonation } from "@/server/services/streamer-donations";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/donations/[id]/reject">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await rejectDonation(user.id, id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

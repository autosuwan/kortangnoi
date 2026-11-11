import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { getDonationDetail } from "@/server/services/streamer-donations";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    return NextResponse.json(await getDonationDetail(user.id, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

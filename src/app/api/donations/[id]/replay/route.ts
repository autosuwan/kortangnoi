import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { replayDonationAlert } from "@/server/services/overlay";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/donations/[id]/replay">,
) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  const { id } = await params;
  try {
    return NextResponse.json(await replayDonationAlert(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

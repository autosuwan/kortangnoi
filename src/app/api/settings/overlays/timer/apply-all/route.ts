import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { applyAllRoundDonations } from "@/server/services/streamer-donations";

export async function POST() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    return NextResponse.json(await applyAllRoundDonations(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

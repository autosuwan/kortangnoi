import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { applyAllRoundDonations } from "@/server/services/streamer-donations";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await applyAllRoundDonations(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

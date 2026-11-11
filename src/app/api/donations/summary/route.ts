import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { getDonationSummary } from "@/server/services/streamer-donations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await getDonationSummary(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

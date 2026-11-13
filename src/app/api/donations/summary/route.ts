import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { getDonationSummary } from "@/server/services/streamer-donations";

export async function GET() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    return NextResponse.json(await getDonationSummary(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

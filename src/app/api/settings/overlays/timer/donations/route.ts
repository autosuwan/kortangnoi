import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { listRoundDonations } from "@/server/services/streamer-donations";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const filter =
    new URL(request.url).searchParams.get("filter") === "pending"
      ? "pending"
      : "all";
  try {
    return NextResponse.json(await listRoundDonations(user.id, filter), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

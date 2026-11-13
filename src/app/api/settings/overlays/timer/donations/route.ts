import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { listRoundDonations } from "@/server/services/streamer-donations";

export async function GET(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
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

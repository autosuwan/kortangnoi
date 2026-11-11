import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import {
  listDonations,
  parseFilter,
} from "@/server/services/streamer-donations";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const params = new URL(request.url).searchParams;
  try {
    return NextResponse.json(
      await listDonations(user.id, {
        filter: parseFilter(params.get("status")),
        page: Number(params.get("page") ?? 1),
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

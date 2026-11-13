import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { STREAMER_STATUSES } from "@/lib/application";
import { getCurrentUser, type StreamerStatus } from "@/server/auth";
import { assertAdmin, listUsers } from "@/server/services/admin";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  try {
    assertAdmin(user.id);
    return NextResponse.json(
      await listUsers({
        q: params.get("q") ?? "",
        status: STREAMER_STATUSES.includes(status as StreamerStatus)
          ? (status as StreamerStatus)
          : null,
        page: Number(params.get("page") ?? 1),
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { assertAdmin, getUserDetail } from "@/server/services/admin";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/admin/users/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    assertAdmin(user.id);
    return NextResponse.json(await getUserDetail(id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

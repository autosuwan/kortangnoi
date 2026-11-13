import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { assertAdmin, changeUserStatus } from "@/server/services/admin";

// approve | reject | suspend | unsuspend — body { note? }
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/users/[id]/[action]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id, action } = await params;
  try {
    assertAdmin(user.id);
    const body = await request.json().catch(() => null);
    return NextResponse.json(await changeUserStatus(user.id, id, action, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { assertAdmin, getAdminStats } from "@/server/services/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    await assertAdmin(user.id);
    return NextResponse.json(await getAdminStats());
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { resetGoal } from "@/server/services/overlay-widgets";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await resetGoal(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

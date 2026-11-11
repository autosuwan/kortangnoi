import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { regenerateOverlayToken } from "@/server/services/overlay";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    return NextResponse.json(await regenerateOverlayToken(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

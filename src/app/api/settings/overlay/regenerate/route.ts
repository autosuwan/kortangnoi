import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { regenerateOverlayToken } from "@/server/services/overlay";

export async function POST() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;

  try {
    return NextResponse.json(await regenerateOverlayToken(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

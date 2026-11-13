import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { markSetupDone } from "@/server/services/setup";

export async function POST() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    await markSetupDone(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

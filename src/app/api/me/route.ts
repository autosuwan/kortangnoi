import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { getMe } from "@/server/services/profile";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    return NextResponse.json(await getMe(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

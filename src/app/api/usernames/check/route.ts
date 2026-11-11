import { NextResponse, type NextRequest } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { isUsernameAvailable } from "@/server/services/profile";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const username = request.nextUrl.searchParams.get("u") ?? "";
  try {
    const available = await isUsernameAvailable(username, user.id);
    return NextResponse.json({ available });
  } catch (error) {
    return toErrorResponse(error);
  }
}

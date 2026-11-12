import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { getProfileSettings, updateProfile } from "@/server/services/profile";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await getProfileSettings(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await updateProfile(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

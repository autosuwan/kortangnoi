import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { getProfileSettings, updateProfile } from "@/server/services/profile";

export async function GET() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    return NextResponse.json(await getProfileSettings(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await updateProfile(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

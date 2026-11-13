import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { getAlertSettings, updateAlertSettings } from "@/server/services/alert";

export async function GET() {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;

  try {
    return NextResponse.json(await getAlertSettings(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

// validate ด้วย alertSettingsUpdateSchema ใน service
export async function PUT(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await updateAlertSettings(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

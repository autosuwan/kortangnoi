import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { uploadAlertMedia } from "@/server/services/alert";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "MEDIA_INVALID", "กรุณาเลือกไฟล์รูป");
  }

  try {
    return NextResponse.json(await uploadAlertMedia(user.id, file));
  } catch (error) {
    return toErrorResponse(error);
  }
}

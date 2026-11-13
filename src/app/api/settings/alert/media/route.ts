import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { uploadAlertMedia } from "@/server/services/alert";

export async function POST(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;

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

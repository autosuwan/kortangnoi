import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { setUsername } from "@/server/services/profile";

const bodySchema = z.object({ username: z.string() });

export async function PUT(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "USERNAME_INVALID", "กรุณากรอกชื่อผู้ใช้");
  }

  try {
    return NextResponse.json(await setUsername(user.id, body.data.username));
  } catch (error) {
    return toErrorResponse(error);
  }
}

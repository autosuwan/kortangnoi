import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import type { ProfileImageKind } from "@/lib/profile";
import { authorizeStreamer } from "@/server/auth";
import {
  removeProfileImage,
  uploadProfileImage,
} from "@/server/services/profile";

const KINDS = new Set<ProfileImageKind>(["avatar", "banner"]);

async function kindOf(
  params: RouteContext<"/api/me/profile/[kind]">["params"],
) {
  const { kind } = await params;
  return KINDS.has(kind as ProfileImageKind)
    ? (kind as ProfileImageKind)
    : null;
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/me/profile/[kind]">,
) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  const kind = await kindOf(params);
  if (!kind) return errorResponse(404, "NOT_FOUND", "ไม่พบหน้านี้");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "MEDIA_INVALID", "กรุณาเลือกไฟล์รูป");
  }
  try {
    return NextResponse.json(await uploadProfileImage(user.id, kind, file));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/me/profile/[kind]">,
) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  const kind = await kindOf(params);
  if (!kind) return errorResponse(404, "NOT_FOUND", "ไม่พบหน้านี้");
  try {
    return NextResponse.json(await removeProfileImage(user.id, kind));
  } catch (error) {
    return toErrorResponse(error);
  }
}

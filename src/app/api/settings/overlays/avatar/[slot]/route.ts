import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import { AVATAR_SLOTS, type AvatarSlot } from "@/lib/overlay-widgets";
import { authorizeStreamer } from "@/server/auth";
import {
  removeAvatarImage,
  uploadAvatarImage,
} from "@/server/services/overlay-widgets";

const SLOTS = new Set<AvatarSlot>(AVATAR_SLOTS);

async function kindOf(
  params: RouteContext<"/api/settings/overlays/avatar/[slot]">["params"],
) {
  const { slot } = await params;
  return SLOTS.has(slot as AvatarSlot) ? (slot as AvatarSlot) : null;
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/settings/overlays/avatar/[slot]">,
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
    return NextResponse.json(await uploadAvatarImage(user.id, kind, file));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/settings/overlays/avatar/[slot]">,
) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;
  const kind = await kindOf(params);
  if (!kind) return errorResponse(404, "NOT_FOUND", "ไม่พบหน้านี้");
  try {
    return NextResponse.json(await removeAvatarImage(user.id, kind));
  } catch (error) {
    return toErrorResponse(error);
  }
}

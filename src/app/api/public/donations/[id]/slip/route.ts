import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse } from "@/lib/api-error";
import { verifySlip } from "@/server/services/slip";

// ตรวจแบบ synchronous ใน request เดียว (SlipOK ตอบ ~1 วินาที, timeout 8 วินาที)
export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/public/donations/[id]/slip">,
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "SLIP_FILE_INVALID", "กรุณาเลือกรูปสลิป");
  }

  try {
    return NextResponse.json(await verifySlip(id, token, file));
  } catch (error) {
    return toErrorResponse(error);
  }
}

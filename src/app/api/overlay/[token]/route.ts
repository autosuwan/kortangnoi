import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { getOverlayByToken } from "@/server/services/overlay";

// หน้า overlay ใน OBS ไม่ได้ล็อกอิน — token ในลิงก์คือสิทธิ์
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/overlay/[token]">,
) {
  const { token } = await params;
  try {
    return NextResponse.json(await getOverlayByToken(token), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

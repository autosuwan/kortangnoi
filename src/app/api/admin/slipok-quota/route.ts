import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import { getSlipOkQuota } from "@/server/integrations/slipok";
import { assertAdmin } from "@/server/services/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    assertAdmin(user.id);
    const quota = await getSlipOkQuota();
    if (!quota) {
      return errorResponse(502, "SLIPOK_UNAVAILABLE", "ดึงข้อมูลโควตาไม่ได้");
    }
    return NextResponse.json(quota);
  } catch (error) {
    return toErrorResponse(error);
  }
}

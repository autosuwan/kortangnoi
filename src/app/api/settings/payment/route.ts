import { NextResponse } from "next/server";

import { toErrorResponse, unauthorized } from "@/lib/api-error";
import { getCurrentUser } from "@/server/auth";
import {
  getPaymentSettings,
  updatePaymentSettings,
} from "@/server/services/payment";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    return NextResponse.json(await getPaymentSettings(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

// validate (Zod + กฎธุรกิจ) อยู่ใน validatePaymentSettings ที่ service เรียก
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await updatePaymentSettings(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

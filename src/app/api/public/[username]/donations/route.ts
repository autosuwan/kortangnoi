import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { clientIp, createDonation } from "@/server/services/donation";

// ผู้บริจาคไม่ต้องล็อกอิน — validate + rate limit ต่อ IP (hash) ใน service
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/public/[username]/donations">,
) {
  const { username } = await params;
  try {
    const body = await request.json().catch(() => null);
    const created = await createDonation(
      username,
      body,
      clientIp(request.headers),
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

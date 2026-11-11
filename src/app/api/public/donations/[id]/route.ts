import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { getDonationForDonor } from "@/server/services/donation";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/public/donations/[id]">,
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  try {
    return NextResponse.json(await getDonationForDonor(id, token), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

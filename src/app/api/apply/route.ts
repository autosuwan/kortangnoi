import { NextResponse } from "next/server";

import { errorResponse, toErrorResponse, unauthorized } from "@/lib/api-error";
import { MAX_CHANNEL_URLS } from "@/lib/application";
import { getCurrentUser } from "@/server/auth";
import {
  getMyApplication,
  submitApplication,
} from "@/server/services/application";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await getMyApplication(user.id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// multipart: realName, phone, channelUrls (ซ้ำได้), images (ซ้ำได้), pdpa=true
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse(400, "APPLICATION_INVALID", "ข้อมูลไม่ถูกต้อง");
  const str = (v: FormDataEntryValue | null) =>
    typeof v === "string" ? v : "";
  const fields = {
    realName: str(form.get("realName")),
    phone: str(form.get("phone")),
    channelUrls: form
      .getAll("channelUrls")
      .map(str)
      .filter((u) => u.trim())
      .slice(0, MAX_CHANNEL_URLS + 1),
    pdpa: form.get("pdpa") === "true",
  };
  const files = form.getAll("images").filter((f) => f instanceof File);
  try {
    return NextResponse.json(await submitApplication(user.id, fields, files));
  } catch (error) {
    return toErrorResponse(error);
  }
}

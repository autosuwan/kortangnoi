import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStreamerStatus } from "@/server/auth";
import { getMe } from "@/server/services/profile";

/** OAuth callback: แลก code เป็น session แล้วพาไปสมัคร (ยังไม่อนุมัติ) / onboarding / dashboard */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const failed = NextResponse.redirect(new URL("/login?error=oauth", origin));
  if (!code) return failed;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failed;

  const status = await getStreamerStatus(data.user.id).catch(() => null);
  if (status !== "approved") {
    return NextResponse.redirect(new URL("/apply", origin));
  }
  const me = await getMe(data.user.id).catch(() => null);
  const next = me?.username ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(next, origin));
}

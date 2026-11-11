import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * refresh session ของ Supabase ทุก request และกันหน้า /dashboard แบบ optimistic
 * (การตรวจสิทธิ์จริงอยู่ใน src/server/auth.ts)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // ยังไม่ได้ตั้ง env (เช่น deploy ก่อนตั้งค่า Supabase) — ไม่ให้ทั้งเว็บล่ม
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase env is missing; skipping session refresh");
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // ต้องเรียกเพื่อ refresh token — อย่าใส่โค้ดอื่นคั่นระหว่าง createServerClient กับบรรทัดนี้
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  if (
    !isLoggedIn &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ล็อกอินอยู่แล้วไม่ต้องเห็นหน้า login
  if (isLoggedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // ข้ามไฟล์ static, รูป และ overlay (ไม่ต้องใช้ session)
    "/((?!_next/static|_next/image|favicon.ico|overlay|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

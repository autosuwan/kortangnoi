/**
 * ค่า env ฝั่ง public (ใช้ได้ทั้ง client และ server)
 * ต้องอ้าง process.env.NEXT_PUBLIC_* ตรงๆ เพื่อให้ Next.js แทนค่าตอน build
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
  /** ฟอร์ม email/password สำหรับ dev และ e2e เท่านั้น (บน cloud ปิด email provider) */
  get passwordLoginEnabled() {
    return process.env.NEXT_PUBLIC_ENABLE_PASSWORD_LOGIN === "true";
  },
};

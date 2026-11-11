import { adminClient, createTestUser, uniqueUsername } from "./supabase";

/** สตรีมเมอร์ที่ตั้ง username + เปิดรับโดเนทแล้ว (เบอร์พร้อมเพย์ทดสอบ) */
export async function createReadyStreamer(
  name = "streamer",
  opts: { enabled?: boolean; minAmountSatang?: number } = {},
) {
  const user = await createTestUser(name);
  const username = uniqueUsername("s");
  const admin = adminClient();
  await admin.from("profiles").update({ username }).eq("id", user.id);
  const { error } = await admin
    .from("payment_settings")
    .update({
      enabled: opts.enabled ?? true,
      promptpay_type: "phone",
      promptpay_id: "0812345678",
      account_name_th: "สมชาย ใจดี",
      min_amount_satang: opts.minAmountSatang ?? 2000,
    })
    .eq("user_id", user.id);
  if (error) throw error;
  return { ...user, username };
}

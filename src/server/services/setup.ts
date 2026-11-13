import "server-only";

import type { SetupProgress } from "@/lib/setup-steps";
import { createAdminClient } from "@/lib/supabase/admin";

/** ความคืบหน้าการตั้งค่าครั้งแรก — ติ๊กตามที่ทำจริง */
export async function getSetupProgress(userId: string): Promise<SetupProgress> {
  const admin = createAdminClient();
  const [profile, payment, alert] = await Promise.all([
    admin
      .from("profiles")
      .select("setup_done_at")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("payment_settings")
      .select("enabled")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("alert_settings")
      .select("customized_at, last_test_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  for (const r of [profile, payment, alert]) if (r.error) throw r.error;
  return {
    done: [
      payment.data?.enabled ?? false,
      Boolean(alert.data?.customized_at),
      Boolean(alert.data?.last_test_at),
    ],
    finished: Boolean(profile.data?.setup_done_at),
  };
}

/** กด "เสร็จแล้ว" หรือซ่อนการ์ดเริ่มต้นใช้งาน (ครั้งแรกเท่านั้น กดซ้ำไม่เปลี่ยนเวลา) */
export async function markSetupDone(userId: string) {
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ setup_done_at: new Date().toISOString() })
    .eq("id", userId)
    .is("setup_done_at", null);
  if (error) throw error;
}

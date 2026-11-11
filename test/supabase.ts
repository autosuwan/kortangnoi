import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import type { Database } from "@/lib/supabase/database.types";

/** helper สำหรับ integration/e2e test กับ Supabase ในเครื่อง (env มาจาก scripts/with-local-supabase.sh) */
function env(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} ไม่มีค่า — รัน test ผ่าน scripts/with-local-supabase.sh`,
    );
  return value;
}

export const TEST_PASSWORD = "test-password-123";

export function adminClient() {
  return createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function anonClient() {
  return createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** สร้างผู้ใช้ทดสอบ (email ยืนยันแล้ว) — trigger จะสร้าง profile + settings ให้ */
export async function createTestUser(name = "tester") {
  const email = `${name}-${randomUUID().slice(0, 8)}@example.test`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email };
}

/** client ที่ล็อกอินเป็นผู้ใช้คนนั้น (ผ่าน RLS) */
export async function signedInClient(email: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  return client;
}

export function uniqueUsername(prefix = "u") {
  return `${prefix}${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

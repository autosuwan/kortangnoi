import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Supabase client ด้วย secret key — ข้าม RLS ใช้ใน service ฝั่ง server เท่านั้น
 * ห้าม import จาก client component (server-only จะทำให้ build พัง)
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey)
    throw new Error("Missing environment variable: SUPABASE_SECRET_KEY");

  return createClient<Database>(publicEnv.supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

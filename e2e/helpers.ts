import type { Page } from "@playwright/test";

import {
  adminClient,
  createTestUser,
  TEST_PASSWORD,
  uniqueUsername,
} from "../test/supabase";

export async function loginWithPassword(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบด้วยรหัสผ่าน" }).click();
}

/** ผู้ใช้ที่ตั้ง username แล้ว ล็อกอินอยู่ที่ /dashboard */
export async function loginAsStreamer(page: Page, name = "streamer") {
  const user = await createTestUser(name);
  const username = uniqueUsername("st");
  const { error } = await adminClient()
    .from("profiles")
    .update({ username, display_name: name })
    .eq("id", user.id);
  if (error) throw error;

  await loginWithPassword(page, user.email);
  await page.waitForURL(/\/dashboard$/);
  return { ...user, username };
}

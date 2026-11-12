import { expect, test } from "@playwright/test";

import { adminClient, TEST_PASSWORD } from "../test/supabase";

import { loginAsStreamer, loginWithPassword } from "./helpers";

// ตรงกับ ADMIN_USER_IDS ในสคริปต์ test:e2e
const ADMIN_ID = "00000000-0000-4000-8000-00000000ad01";
const ADMIN_EMAIL = "admin-e2e@example.test";

async function ensureAdminUser() {
  const admin = adminClient();
  const { data } = await admin.auth.admin.getUserById(ADMIN_ID);
  if (!data.user) {
    const { error } = await admin.auth.admin.createUser({
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "admin" },
    } as Parameters<typeof admin.auth.admin.createUser>[0] & { id: string });
    // desktop/mobile รันพร้อมกัน อีกฝั่งอาจสร้างไปก่อน
    if (error) {
      const again = await admin.auth.admin.getUserById(ADMIN_ID);
      if (!again.data.user) throw error;
    }
  }
  await admin
    .from("profiles")
    .update({ username: "e2eadmin", display_name: "admin" })
    .eq("id", ADMIN_ID);
}

test("ผู้ใช้ทั่วไปไม่เห็นเมนูแอดมิน และเปิดหน้า/API แอดมินได้ 404", async ({ page }) => {
  await loginAsStreamer(page, "not-admin");
  await expect(page.getByRole("link", { name: "แอดมิน" })).toHaveCount(0);
  await page.goto("/dashboard/admin");
  await expect(page.getByText("ไม่พบหน้านี้")).toBeVisible();
  expect((await page.request.get("/api/admin/stats")).status()).toBe(404);
  expect((await page.request.get("/api/admin/slipok-quota")).status()).toBe(
    404,
  );
});

test("แอดมินเห็นโควตา SlipOK สถิติ และ error ล่าสุด", async ({ page }) => {
  await ensureAdminUser();
  await adminClient()
    .from("system_errors")
    .insert({ source: "slipok", code: "1002", message: "e2e auth error" });

  await loginWithPassword(page, ADMIN_EMAIL);
  await page.waitForURL(/\/dashboard$/);
  await page
    .getByRole("navigation", { name: "เมนูหลัก" })
    .filter({ visible: true })
    .getByRole("link", { name: "แอดมิน" })
    .click();
  await expect(page.getByTestId("quota-remaining")).toHaveText("87");
  await expect(page.getByTestId("checks-approved")).toBeVisible();
  await expect(page.getByTestId("recent-errors")).toContainText(
    "e2e auth error",
  );
});

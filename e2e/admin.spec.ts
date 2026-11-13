import { expect, test } from "@playwright/test";

import { createReadyStreamer } from "../test/streamer";
import { adminClient, createTestUser, TEST_PASSWORD } from "../test/supabase";

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
  await page.getByRole("tab", { name: "ระบบ" }).click();
  await expect(page.getByTestId("quota-remaining")).toHaveText("87");
  await expect(page.getByTestId("checks-approved")).toBeVisible();
  await expect(page.getByTestId("recent-errors")).toContainText(
    "e2e auth error",
  );
});

test("ผู้ใช้ใหม่ต้องสมัคร → แอดมินอนุมัติ → ใช้งานได้; ระงับ → หน้าโดเนทปิด", async ({
  browser,
}) => {
  await ensureAdminUser();
  const u = await createTestUser("newbie", { status: "pending_application" });
  const realName = `สมหญิง ${u.id.slice(0, 6)}`;

  // ผู้ใช้ใหม่: เข้า dashboard ไม่ได้ → /apply, API สตรีมเมอร์ 403
  const userCtx = await browser.newContext();
  const page = await userCtx.newPage();
  await loginWithPassword(page, u.email);
  await page.waitForURL(/\/apply$/);
  const api = await page.request.get("/api/settings/payment");
  expect(api.status()).toBe(403);
  expect((await api.json()).error.code).toBe("STREAMER_NOT_APPROVED");

  await page.getByLabel("ชื่อ-นามสกุลจริง").fill(realName);
  await page.getByLabel("เบอร์โทรศัพท์มือถือ").fill("0898765432");
  await page.getByLabel("ลิงก์ช่อง 1").fill("https://www.twitch.tv/somying");
  await page.getByLabel("แนบรูปหน้าช่อง").setInputFiles("public/logo-mark.png");
  // ยังไม่ติ๊ก PDPA
  await page.getByRole("button", { name: "ส่งใบสมัคร" }).click();
  await expect(page.getByText("ต้องยอมรับนโยบายความเป็นส่วนตัวก่อนส่ง")).toBeVisible();
  await page.getByLabel(/ยินยอมให้เก็บ/).check();
  await page.getByRole("button", { name: "ส่งใบสมัคร" }).click();
  await expect(page.getByText("รอแอดมินตรวจสอบ")).toBeVisible();
  await page.goto("/dashboard");
  await page.waitForURL(/\/apply$/);

  // แอดมินอนุมัติ
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await loginWithPassword(adminPage, ADMIN_EMAIL);
  await adminPage.waitForURL(/\/dashboard$/);
  await adminPage.goto("/dashboard/admin");
  await adminPage.getByRole("tab", { name: /คำขอสมัคร/ }).click();
  await adminPage
    .getByTestId("admin-user-row")
    .filter({ hasText: realName })
    .click();
  await expect(
    adminPage.getByRole("dialog").getByText(realName).first(),
  ).toBeVisible();
  await expect(
    adminPage.getByRole("dialog").getByText("0898765432"),
  ).toBeVisible();
  await expect(
    adminPage.getByRole("img", { name: "รูปหน้าช่อง 1" }),
  ).toBeVisible();
  await adminPage.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await expect(
    adminPage.getByRole("dialog").getByTestId("user-status"),
  ).toHaveText("อนุมัติแล้ว");

  // ผู้ใช้เข้าได้ → ตั้ง username
  await page.goto("/apply");
  await page.waitForURL(/\/onboarding$/);

  // ระงับ → หน้าโดเนทปิด + dashboard ถูกพาไป /apply
  const s = await createReadyStreamer("tosuspend");
  await adminPage.goto("/dashboard/admin");
  await adminPage.getByRole("tab", { name: "ผู้ใช้ทั้งหมด" }).click();
  await adminPage.getByLabel("ค้นหาผู้ใช้").fill(s.username);
  await adminPage
    .getByTestId("admin-user-row")
    .filter({ hasText: s.username })
    .click();
  await adminPage.getByRole("button", { name: "ระงับบัญชี" }).click();
  await adminPage.getByLabel("เหตุผล").fill("ทดสอบระงับ");
  await adminPage.getByRole("button", { name: "ยืนยันระงับบัญชี" }).click();
  await expect(
    adminPage.getByRole("dialog").getByTestId("user-status"),
  ).toHaveText("ระงับ");
  await page.goto(`/${s.username}`);
  await expect(page.getByText("ตอนนี้ปิดรับโดเนท")).toBeVisible();

  await userCtx.close();
  await adminCtx.close();
});

test("เจ้าของระบบให้สิทธิ์แอดมิน → ผู้ใช้เห็นเมนูแอดมิน → ถอน → หาย", async ({
  browser,
}) => {
  await ensureAdminUser();
  const s = await createReadyStreamer("helperadm");

  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await loginWithPassword(owner, ADMIN_EMAIL);
  await owner.waitForURL(/\/dashboard$/);
  await owner.goto("/dashboard/admin");
  await owner.getByRole("tab", { name: "ผู้ใช้ทั้งหมด" }).click();
  await owner.getByLabel("ค้นหาผู้ใช้").fill(s.username);
  await owner
    .getByTestId("admin-user-row")
    .filter({ hasText: s.username })
    .click();
  const sheet = owner.getByRole("dialog");
  await sheet.getByRole("button", { name: "ให้สิทธิ์แอดมิน" }).click();
  await sheet.getByRole("button", { name: "ยืนยันให้สิทธิ์แอดมิน" }).click();
  await expect(sheet.getByTestId("user-role")).toHaveText("แอดมิน");
  // แอดมินระงับไม่ได้ (ไม่มีปุ่ม)
  await expect(sheet.getByRole("button", { name: "ระงับบัญชี" })).toHaveCount(0);

  const userCtx = await browser.newContext();
  const page = await userCtx.newPage();
  await loginWithPassword(page, s.email);
  await page.waitForURL(/\/dashboard$/);
  const nav = page
    .getByRole("navigation", { name: "เมนูหลัก" })
    .filter({ visible: true });
  await expect(nav.getByRole("link", { name: "แอดมิน" })).toBeVisible();
  // แอดมินที่ได้สิทธิ์ให้สิทธิ์ต่อไม่ได้
  const res = await page.request.post(`/api/admin/users/${s.id}/revoke_admin`, {
    data: {},
  });
  expect(res.status()).toBe(403);

  await sheet.getByRole("button", { name: "ถอนสิทธิ์แอดมิน" }).click();
  await sheet.getByRole("button", { name: "ยืนยันถอนสิทธิ์แอดมิน" }).click();
  await expect(sheet.getByTestId("user-role")).toHaveCount(0);
  await page.reload();
  await expect(nav.getByRole("link", { name: "แอดมิน" })).toHaveCount(0);
  await page.goto("/dashboard/admin");
  await expect(page.getByText("ไม่พบหน้านี้")).toBeVisible();

  await ownerCtx.close();
  await userCtx.close();
});

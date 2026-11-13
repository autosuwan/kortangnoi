import { expect, test } from "@playwright/test";

import { createTestUser, uniqueUsername } from "../test/supabase";

import { loginWithPassword } from "./helpers";

test("ไม่ได้ล็อกอินเข้า /dashboard ถูกพาไป /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" }),
  ).toBeVisible();
});

test("ผู้ใช้ใหม่: ล็อกอิน → ตั้ง username → dashboard → ออกจากระบบ", async ({
  page,
}) => {
  const user = await createTestUser("streamer");
  const username = uniqueUsername("st");

  await loginWithPassword(page, user.email);
  await expect(page).toHaveURL(/\/onboarding$/);

  const input = page.getByLabel("ชื่อผู้ใช้");
  await input.fill(username.toUpperCase());
  await expect(page.getByLabel("ใช้ได้")).toBeVisible();
  await expect(page.getByText(`localhost:3100/${username}`)).toBeVisible();
  await page.getByRole("button", { name: "บันทึกและไปต่อ" }).click();

  // ตั้ง username แล้วเข้าโหมดตั้งค่าครั้งแรก ขั้นที่ 1 — ข้ามไว้ก่อนได้
  await expect(page).toHaveURL(/\/dashboard\/payment\?setup=1$/);
  await page.getByRole("link", { name: "ข้ามไว้ก่อน" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("donate-url")).toHaveText(
    `http://localhost:3100/${username}`,
  );

  // ล็อกอินแล้วเปิด /login → กลับ dashboard
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("username ที่มีคนใช้แล้วกดบันทึกไม่ได้", async ({ page, browser }) => {
  const taken = uniqueUsername("tk");

  // คนแรกจองชื่อไว้ (ใช้ context แยก จะได้ไม่ใช้ cookie ร่วมกัน)
  const first = await createTestUser("first");
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await loginWithPassword(firstPage, first.email);
  await firstPage.getByLabel("ชื่อผู้ใช้").fill(taken);
  await firstPage.getByRole("button", { name: "บันทึกและไปต่อ" }).click();
  await expect(firstPage).toHaveURL(/\/dashboard\/payment/);
  await firstContext.close();

  const second = await createTestUser("second");
  await loginWithPassword(page, second.email);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("ชื่อผู้ใช้").fill(taken);
  await expect(page.getByText("ชื่อนี้มีคนใช้แล้ว")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "บันทึกและไปต่อ" }),
  ).toBeDisabled();
});

test("username ผิดรูปแบบแสดงคำอธิบาย", async ({ page }) => {
  const user = await createTestUser();
  await loginWithPassword(page, user.email);
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("ชื่อผู้ใช้").fill("ab");
  await expect(
    page.getByText("ใช้ได้ 3–20 ตัว เฉพาะ a–z, 0–9, _ และ -"),
  ).toBeVisible();
  await page.getByLabel("ชื่อผู้ใช้").fill("dashboard");
  await expect(page.getByText("ชื่อนี้ใช้ไม่ได้ ลองชื่ออื่น")).toBeVisible();
});

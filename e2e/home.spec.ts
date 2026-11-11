import { expect, test } from "@playwright/test";

test("หน้าแรกแสดงชื่อเว็บและปุ่มเริ่มต้นใช้งาน", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KORTANGNOI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "เริ่มต้นใช้งาน" })).toBeVisible();
});

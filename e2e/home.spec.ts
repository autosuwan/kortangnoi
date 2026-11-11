import { expect, test } from "@playwright/test";

test("หน้าแรกแสดงหัวข้อ จุดเด่น และลิงก์เริ่มต้นใช้งาน", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /รับโดเนทผ่านพร้อมเพย์/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ตรวจสลิปอัตโนมัติ" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "เริ่มต้นใช้งาน" })).toHaveAttribute(
    "href",
    "/login",
  );
});

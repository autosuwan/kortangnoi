import { expect, test, type Page } from "@playwright/test";

import { loginAsStreamer } from "./helpers";

/** เปิดหน้าแล้วรอ hydrate — ก่อนนั้น input file ยังไม่มี onChange */
async function openAlertPage(page: Page) {
  await page.goto("/dashboard/alert");
  await page.waitForLoadState("networkidle");
}

test("อัปโหลดรูป → พรีวิวเปลี่ยน → reload ยังอยู่ → ใช้ค่าเริ่มต้น", async ({ page }) => {
  await loginAsStreamer(page, "alert-e2e");
  await openAlertPage(page);

  const image = page.getByTestId("alert-image");
  await expect(image).toHaveAttribute("src", "/alert-default.png");

  await page.getByLabel("เลือกไฟล์รูป").setInputFiles("public/logo-mark.png");
  await expect(image).toHaveAttribute("src", /\/alert-media\/.+\.png$/);
  // อัปโหลดบันทึกทันที ไม่มีแถบยังไม่บันทึก
  await expect(
    page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" }),
  ).toBeHidden();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(image).toHaveAttribute("src", /\/alert-media\/.+\.png$/);

  await page.getByRole("button", { name: "ใช้ค่าเริ่มต้น" }).click();
  await expect(image).toHaveAttribute("src", "/alert-default.png");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(image).toHaveAttribute("src", "/alert-default.png");
});

test("ไฟล์ที่ไม่ใช่รูปแสดง error", async ({ page }) => {
  await loginAsStreamer(page, "alert-bad");
  await openAlertPage(page);

  await page.getByLabel("เลือกไฟล์รูป").setInputFiles({
    name: "evil.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg onload=alert(1)>"),
  });
  await expect(
    page.getByText("รองรับเฉพาะรูป PNG, JPG, GIF หรือ WebP"),
  ).toBeVisible();
});

test("ปรับเวลาและเสียง → บันทึก → reload", async ({ page }) => {
  await loginAsStreamer(page, "alert-tune");
  await openAlertPage(page);
  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });

  const duration = page.getByRole("slider", { name: "ระยะเวลาแสดง (วินาที)" });
  await duration.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("duration-value")).toHaveText("10 วินาที");

  await page.getByRole("switch", { name: "เปิดเสียง" }).click();
  await expect(page.getByRole("slider", { name: "ระดับเสียง" })).toBeDisabled();

  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("duration-value")).toHaveText("10 วินาที");
  await expect(page.getByRole("switch", { name: "เปิดเสียง" })).not.toBeChecked();
});

test("เล่นพรีวิว: alert หายไปตามเวลาแล้วกลับมา", async ({ page }) => {
  await loginAsStreamer(page, "alert-play");
  await openAlertPage(page);

  const duration = page.getByRole("slider", { name: "ระยะเวลาแสดง (วินาที)" });
  await duration.focus();
  await page.keyboard.press("Home"); // 3 วินาที

  await page.getByRole("button", { name: "เล่นพรีวิว" }).click();
  const image = page.getByTestId("alert-image");
  await expect(image).toBeVisible();
  await expect(image).toBeHidden({ timeout: 5000 });
  await expect(image).toBeVisible({ timeout: 3000 });
});

test("หน้า alert ไม่ล้นจอแนวนอน (มือถือ)", async ({ page }) => {
  await loginAsStreamer(page, "alert-width");
  await openAlertPage(page);
  const [scrollWidth, innerWidth] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

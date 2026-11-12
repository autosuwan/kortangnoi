import { expect, test } from "@playwright/test";

import { createReadyStreamer } from "../test/streamer";
import { uniqueUsername } from "../test/supabase";

import { loginAsStreamer } from "./helpers";

test("ตั้งค่าโปรไฟล์: รูป แบนเนอร์ ชื่อ แนะนำตัว → หน้าโดเนทแสดงตาม", async ({
  page,
}) => {
  const s = await loginAsStreamer(page, "prof-e2e");
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");

  // ชื่อจริงจาก auth อ่านอย่างเดียว
  await expect(page.getByTestId("real-name")).toHaveText("prof-e2e");

  await page
    .getByLabel("เลือกไฟล์รูปโปรไฟล์")
    .setInputFiles("public/logo-mark.png");
  await expect(page.getByTestId("streamer-avatar")).toHaveAttribute(
    "src",
    /profile-media/,
  );
  await page
    .getByLabel("เลือกไฟล์แบนเนอร์")
    .setInputFiles("public/alert-default.png");
  await expect(page.getByTestId("streamer-banner")).toHaveAttribute(
    "src",
    /profile-media/,
  );

  await page.getByLabel("ชื่อที่แสดง").fill("แมวส้มสตรีม");
  await page.getByLabel("แนะนำตัว").fill("สตรีมทุกคืน");
  await expect(page.getByTestId("streamer-name")).toHaveText("แมวส้มสตรีม");
  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  await page.goto(`/${s.username}`);
  await expect(page.getByTestId("streamer-name")).toHaveText("แมวส้มสตรีม");
  await expect(page.getByTestId("streamer-bio")).toHaveText("สตรีมทุกคืน");
  await expect(page.getByTestId("streamer-avatar")).toBeVisible();
  await expect(page.getByTestId("streamer-banner")).toBeVisible();
  // ชื่อจริงไม่หลุดไปหน้าสาธารณะ (ชื่อจริงของผู้ใช้ทดสอบคือ prof-e2e และชื่อที่แสดงเปลี่ยนแล้ว)
  await expect(page.getByText("prof-e2e")).toHaveCount(0);

  const [sw, iw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    innerWidth,
  ]);
  expect(sw).toBeLessThanOrEqual(iw);
});

test("เปลี่ยนลิงก์โดเนท: ลิงก์ใหม่ใช้ได้ ลิงก์เก่า 404", async ({ page }) => {
  const s = await loginAsStreamer(page, "prof-link");
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");

  const next = uniqueUsername("n");
  await page.getByLabel("ชื่อในลิงก์").fill(next);
  await expect(page.getByLabel("ใช้ได้")).toBeVisible();
  await expect(page.getByText(`ลิงก์เก่า`)).toBeVisible();
  await page.getByRole("button", { name: "เปลี่ยนลิงก์" }).click();
  await expect(page.getByText("เปลี่ยนลิงก์แล้ว")).toBeVisible();

  await page.goto(`/${next}`);
  await expect(page.getByTestId("streamer-name")).toHaveText("prof-link");
  await page.goto(`/${s.username}`);
  await expect(page.getByText("ไม่พบหน้านี้")).toBeVisible();
});

test("หน้าโดเนทบนคอมเป็น 2 คอลัมน์", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const s = await createReadyStreamer("prof-layout");
  await page.goto(`/${s.username}`);
  await expect(page.getByLabel("ชื่อที่แสดง")).toBeVisible();
  const card = (await page.getByTestId("streamer-name").boundingBox())!;
  const form = (await page.getByLabel("ชื่อที่แสดง").boundingBox())!;
  expect(form.x).toBeGreaterThan(card.x + card.width);
});

import { expect, test } from "@playwright/test";

import { adminClient } from "../test/supabase";

import { loginAsStreamer } from "./helpers";

test("loading bar สีส้มขอบบน: ค้างเต็มตลอด เปลี่ยนหน้าแล้ววิ่งใหม่ และไม่อยู่ใน overlay", async ({
  page,
  context,
}) => {
  const user = await loginAsStreamer(page, "bar");
  const bar = page.getByTestId("top-progress");
  await expect(bar).toHaveAttribute("data-loading", "false");
  const box = (await bar.boundingBox())!;
  expect(box.y).toBe(0);
  expect(box.width).toBe(page.viewportSize()!.width);

  // หน่วงการโหลดหน้าถัดไปให้เห็นช่วงกำลังโหลด
  await page.route("**/dashboard/payment**", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await page.goto("/dashboard"); // ให้ route มีผลกับการนำทางฝั่ง client
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "ช่องทางรับเงิน" }).click();
  await expect(bar).toHaveAttribute("data-loading", "true");
  await expect(page).toHaveURL(/\/dashboard\/payment$/);
  await expect(bar).toHaveAttribute("data-loading", "false");

  // พื้นหลังลายเหมือนหน้าแรกใน dashboard
  const bg = await page
    .locator(".app-bg")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).not.toBe("none");

  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", user.id)
    .single();
  const overlay = await context.newPage();
  await overlay.goto(`/overlay/${data!.overlay_token}`);
  await expect(overlay.getByTestId("overlay")).toBeVisible();
  await expect(overlay.getByTestId("top-progress")).toHaveCount(0);
});

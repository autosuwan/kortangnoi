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

  // จดทุกค่าของ data-loading ระหว่างเปลี่ยนหน้า (หน้าที่ prefetch แล้วอาจโหลดเสร็จเร็วมาก
  // เช็กแค่จังหวะเดียวจะพลาดได้)
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="top-progress"]')!;
    const seen: string[] = [];
    (window as unknown as { __barStates: string[] }).__barStates = seen;
    new MutationObserver(() =>
      seen.push(el.getAttribute("data-loading")!),
    ).observe(el, { attributes: true, attributeFilter: ["data-loading"] });
  });
  await page
    .getByRole("navigation", { name: "เมนูหลัก" })
    .getByRole("link", { name: "ช่องทางรับเงิน" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/payment$/);
  await expect(bar).toHaveAttribute("data-loading", "false");
  const states = await page.evaluate(
    () => (window as unknown as { __barStates: string[] }).__barStates,
  );
  expect(states).toContain("true");
  expect(states.at(-1)).toBe("false");

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

test("dashboard: เมนูซ้ายและแถบหัวอยู่กับที่ตอนเลื่อน", async ({ page }) => {
  await loginAsStreamer(page, "sticky");
  await page.goto("/dashboard/alert");
  await page.waitForLoadState("networkidle");
  const header = page.getByTestId("page-header");
  const nav = page.getByRole("navigation", { name: "เมนูหลัก" });
  const before = {
    header: (await header.boundingBox())!,
    nav: (await nav.boundingBox())!,
  };

  await page
    .getByTestId("dashboard-scroll")
    .evaluate((el) => el.scrollTo(0, 2000));
  await page.waitForTimeout(200);
  const scrolled = await page
    .getByTestId("dashboard-scroll")
    .evaluate((el) => el.scrollTop);
  expect(scrolled).toBeGreaterThan(100);
  expect((await header.boundingBox())!.y).toBe(before.header.y);
  expect((await nav.boundingBox())!.y).toBe(before.nav.y);
});

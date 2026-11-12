import { expect, test } from "@playwright/test";

import { createReadyStreamer } from "../test/streamer";
import { adminClient } from "../test/supabase";

import { donateViaApi, loginWithPassword } from "./helpers";

async function tokenOf(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", userId)
    .single();
  return data!.overlay_token;
}

test("ตั้ง goal ใน dashboard → overlay goal/อันดับ/ล่าสุด อัปเดตทันทีเมื่อโดเนทผ่าน", async ({
  page,
  context,
  request,
}) => {
  const s = await createReadyStreamer("widgets");
  await loginWithPassword(page, s.email);
  await page.waitForURL(/\/dashboard$/);

  await page
    .getByRole("navigation", { name: "เมนูหลัก" })
    .filter({ visible: true })
    .getByRole("link", { name: "Overlay" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/overlays$/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("ชื่อเป้าหมาย").fill("ซื้อไมค์ใหม่");
  await page.getByLabel("ยอดเป้าหมาย (บาท)").fill("500");
  // พรีวิวเปลี่ยนตามที่พิมพ์
  await expect(page.getByTestId("widget-preview-goal")).toContainText(
    "ซื้อไมค์ใหม่",
  );
  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  // ลิงก์ซ่อน token
  const token = await tokenOf(s.id);
  await expect(page.getByTestId("widget-url-goal")).not.toContainText(token);
  await expect(page.getByTestId("widget-url-goal")).toContainText("/goal");

  const goal = await context.newPage();
  await goal.goto(`/overlay/${token}/goal`);
  const widget = goal.getByTestId("goal-widget");
  await expect(widget).toHaveAttribute("data-percent", "0");
  await expect(widget).toContainText("ซื้อไมค์ใหม่");
  expect(
    await goal.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");

  const top = await context.newPage();
  await top.goto(`/overlay/${token}/top`);
  await expect(top.getByTestId("top-widget")).toContainText("ยังไม่มีโดเนท");
  const recent = await context.newPage();
  await recent.goto(`/overlay/${token}/recent`);
  await expect(recent.getByTestId("recent-widget")).toContainText("ยังไม่มีโดเนท");
  // รอ subscribe channel
  await goal.waitForTimeout(1500);

  const { status } = await donateViaApi(
    request,
    s.username,
    "แมวส้ม",
    125,
    12500,
  );
  expect(status).toBe("approved");

  await expect(widget).toHaveAttribute("data-percent", "25", { timeout: 8000 });
  await expect(goal.getByTestId("goal-amount")).toHaveText("125 / 500 บาท");
  await expect(top.getByTestId("top-widget")).toContainText("แมวส้ม", {
    timeout: 8000,
  });
  await expect(recent.getByTestId("recent-widget")).toContainText("แมวส้ม", {
    timeout: 8000,
  });

  // เริ่มนับใหม่ → หลอดกลับ 0 (overlay ได้ event settings)
  await page.getByRole("button", { name: "เริ่มนับใหม่" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "เริ่มนับใหม่" })
    .click();
  await expect(widget).toHaveAttribute("data-percent", "0", { timeout: 8000 });
});

test("QR overlay ชี้ไปหน้าโดเนท และลิงก์ผิดแสดงข้อความ", async ({ page }) => {
  const s = await createReadyStreamer("wqr");
  const token = await tokenOf(s.id);
  await page.goto(`/overlay/${token}/qr`);
  const qr = page.getByTestId("qr-widget");
  await expect(qr).toHaveAttribute("data-url", new RegExp(`/${s.username}$`));
  await expect(qr).toContainText("สแกนเพื่อโดเนท");
  await expect(qr.getByRole("img")).toBeVisible();

  await page.goto(`/overlay/${"x".repeat(43)}/goal`);
  await expect(page.getByText(/ลิงก์ overlay ไม่ถูกต้อง/)).toBeVisible();

  await page.goto(`/overlay/${token}/nope`);
  await expect(page.getByText("ไม่พบหน้านี้")).toBeVisible();
});

test("ปรับหน้าตา goal (ความกว้าง + สีหลอด) → พรีวิว + OBS เปลี่ยนทันที", async ({
  page,
  context,
}) => {
  const s = await createReadyStreamer("wstyle");
  await loginWithPassword(page, s.email);
  await page.waitForURL(/\/dashboard$/);
  const token = await tokenOf(s.id);

  const obs = await context.newPage();
  // OBS Browser Source กว้างเท่าที่ตั้ง ไม่ใช่จอมือถือ
  await obs.setViewportSize({ width: 1280, height: 720 });
  await obs.goto(`/overlay/${token}/goal`);
  const widget = obs.getByTestId("goal-widget");
  await expect(widget).toBeVisible();
  // ค่าเริ่มต้นกว้าง 600 (เดิม 768)
  expect((await widget.boundingBox())!.width).toBeCloseTo(600, 0);
  await obs.waitForTimeout(1500);

  await page.goto("/dashboard/overlays");
  await page.waitForLoadState("networkidle");
  const width = page.getByRole("slider", { name: "ความกว้างหลอด" });
  await width.focus();
  await page.keyboard.press("Home"); // 300px
  await page.getByLabel("สีหลอด (ซ้าย)", { exact: true }).fill("#22C55E");
  await expect(
    page.getByTestId("widget-preview-goal").getByTestId("goal-bar"),
  ).toHaveCSS("background-image", /rgb\(34, 197, 94\)/);

  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  // OBS ได้ event settings → โหลดหน้าตาใหม่โดยไม่ต้อง refresh
  await expect(obs.getByTestId("goal-bar")).toHaveCSS(
    "background-image",
    /rgb\(34, 197, 94\)/,
    { timeout: 8000 },
  );
  await expect
    .poll(async () => (await widget.boundingBox())!.width)
    .toBeCloseTo(300, 0);

  // คืนค่าเริ่มต้น → สีกลับ
  await page.getByRole("button", { name: "คืนค่าเริ่มต้น" }).click();
  await expect(page.getByLabel("สีหลอด (ซ้าย)", { exact: true })).toHaveValue(
    "#FBBF24",
  );
});

test("Subathon: เริ่มที่ 01:00:00 → OBS นับถอยหลัง → โดเนทผ่านเวลาเพิ่ม → พัก", async ({
  page,
  context,
  request,
}) => {
  const s = await createReadyStreamer("subathon");
  await loginWithPassword(page, s.email);
  await page.waitForURL(/\/dashboard$/);
  const token = await tokenOf(s.id);

  const obs = await context.newPage();
  await obs.setViewportSize({ width: 1280, height: 720 });
  await obs.goto(`/overlay/${token}/timer`);
  const time = obs.getByTestId("timer-time");
  await expect(time).toHaveText("01:00:00");
  await expect(obs.getByTestId("timer-widget")).toHaveAttribute(
    "data-status",
    "idle",
  );
  await obs.waitForTimeout(1500);

  await page.goto("/dashboard/overlays");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Subathon" }).click();
  await expect(page.getByTestId("timer-clock")).toHaveText("01:00:00");
  await page.getByRole("button", { name: "เริ่มนับ" }).click();
  await expect(page.getByTestId("timer-status")).toHaveText("กำลังนับ");

  // OBS ได้ event → นับถอยหลัง
  await expect(obs.getByTestId("timer-widget")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 8000 },
  );
  await expect(time).toHaveText(/^00:59:5\d$/, { timeout: 5000 });

  // โดเนท 100 บาท = +10 นาที
  const { status } = await donateViaApi(
    request,
    s.username,
    "แมวส้ม",
    100,
    10000,
  );
  expect(status).toBe("approved");
  await expect(obs.getByTestId("timer-delta")).toHaveText("+10:00", {
    timeout: 8000,
  });
  await expect(time).toHaveText(/^01:09:\d\d$/);

  await page.getByRole("button", { name: "พัก" }).click();
  await expect(page.getByTestId("timer-status")).toHaveText("พักอยู่");
  await expect(obs.getByTestId("timer-widget")).toHaveAttribute(
    "data-status",
    "paused",
    { timeout: 8000 },
  );
  const frozen = await time.textContent();
  await obs.waitForTimeout(1500);
  await expect(time).toHaveText(frozen!);
});

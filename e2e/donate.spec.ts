import { expect, test } from "@playwright/test";

import { createReadyStreamer } from "../test/streamer";
import { adminClient } from "../test/supabase";

test("ผู้ชมโดเนท: กรอก → ได้ QR + นับถอยหลัง → reload ยังอยู่", async ({ page }) => {
  const s = await createReadyStreamer("donate-e2e");
  await page.goto(`/${s.username}`);
  await expect(page.getByTestId("streamer-name")).toHaveText("donate-e2e");

  await page.getByLabel("ชื่อที่แสดง").fill("ผู้ชมใจดี");
  await page.getByRole("button", { name: "100", exact: true }).click();
  await expect(page.getByLabel("ยอด (บาท)")).toHaveValue("100");
  await page.getByLabel("ข้อความ").fill("สู้ๆ นะ");
  await page.getByRole("button", { name: "ไปหน้าจ่ายเงิน" }).click();

  await expect(page).toHaveURL(new RegExp(`/${s.username}/d/[0-9a-f-]+\\?t=`));
  await expect(page.getByTestId("donation-qr")).toBeVisible();
  await expect(page.getByText("100บาท")).toBeVisible();
  // QR อยู่ในจอ ไม่ล้นการ์ด (เคยล้นบนมือถือ)
  const qr = (await page.getByTestId("donation-qr").boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(qr.x).toBeGreaterThanOrEqual(0);
  expect(qr.x + qr.width).toBeLessThanOrEqual(viewport.width);
  await expect(page.getByText("ชื่อบัญชี: สมชาย ใจดี")).toBeVisible();
  await expect(page.getByTestId("countdown")).toHaveText(/^(29|30):\d\d$/);

  await page.reload();
  await expect(page.getByTestId("donation-qr")).toBeVisible();

  // ลิงก์ที่ token ผิด
  await page.goto(page.url().replace(/t=[^&]+/, `t=${"A".repeat(43)}`));
  await expect(page.getByText("ไม่พบรายการนี้")).toBeVisible();

  // ไม่ล้นจอ
  await page.goBack();
  const [sw, iw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    innerWidth,
  ]);
  expect(sw).toBeLessThanOrEqual(iw);
});

test("ยอดต่ำกว่าขั้นต่ำแสดง error, ปิดรับแสดงข้อความ, username ไม่มี → 404", async ({
  page,
}) => {
  const s = await createReadyStreamer("donate-min", { minAmountSatang: 5000 });
  await page.goto(`/${s.username}`);
  await expect(page.getByText("ขั้นต่ำ 50 บาท")).toBeVisible();
  // ปุ่มยอดด่วนที่ต่ำกว่าขั้นต่ำไม่แสดง
  await expect(
    page.getByRole("button", { name: "20", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("ชื่อที่แสดง").fill("a");
  await page.getByLabel("ยอด (บาท)").fill("49.99");
  await page.getByRole("button", { name: "ไปหน้าจ่ายเงิน" }).click();
  await expect(page.getByText("ยอดต้องไม่ต่ำกว่า 50 บาท")).toBeVisible();

  const closed = await createReadyStreamer("donate-closed", { enabled: false });
  await page.goto(`/${closed.username}`);
  await expect(page.getByText("ตอนนี้ปิดรับโดเนท")).toBeVisible();

  await page.goto("/no-such-streamer-xyz");
  await expect(page.getByText("ไม่พบหน้านี้")).toBeVisible();
});

test("ผู้บริจาคปรับ alert ได้เฉพาะส่วนที่สตรีมเมอร์เปิด + พรีวิว", async ({ page }) => {
  const s = await createReadyStreamer("donate-style");
  await page.goto(`/${s.username}`);
  await expect(page.getByText("ปรับแต่ง alert ของคุณ")).toHaveCount(0);

  await adminClient()
    .from("alert_settings")
    .update({
      donor_can_pick_color: true,
      donor_can_pick_support_text: true,
      support_text: "ให้ค่าข้าว",
    })
    .eq("user_id", s.id);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("ปรับแต่ง alert ของคุณ")).toBeVisible();
  await expect(page.getByText("รูป GIF")).toHaveCount(0);

  const headline = page.getByTestId("alert-headline");
  await page.getByLabel("ชื่อที่แสดง").fill("น้องแมว");
  await page.getByRole("button", { name: "50", exact: true }).click();
  await expect(headline).toHaveText("น้องแมว ให้ค่าข้าว 50 บาท");
  await page.getByLabel("คำสนับสนุน").fill("ให้ค่าขนม");
  await page.getByRole("button", { name: "สี #EC4899" }).click();
  await expect(headline).toHaveText("น้องแมว ให้ค่าขนม 50 บาท");
  await expect(page.getByTestId("alert-name")).toHaveCSS(
    "color",
    "rgb(236, 72, 153)",
  );

  await page.getByRole("button", { name: "ไปหน้าจ่ายเงิน" }).click();
  await expect(page.getByTestId("donation-qr")).toBeVisible();
  const { data } = await adminClient()
    .from("donations")
    .select("donor_name_color, donor_support_text")
    .eq("streamer_id", s.id)
    .single();
  expect(data).toEqual({
    donor_name_color: "#EC4899",
    donor_support_text: "ให้ค่าขนม",
  });
});

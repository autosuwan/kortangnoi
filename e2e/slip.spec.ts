import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { fakeSlipPayload, goodSlip, slipPng } from "../test/slip";
import { createReadyStreamer } from "../test/streamer";
import { adminClient } from "../test/supabase";

// SLIPOK_PROVIDER=fake: QR ในรูปกำหนดผลของ SlipOK จำลอง

async function donate(page: Page, username: string) {
  await page.goto(`/${username}`);
  await page.getByLabel("ชื่อที่แสดง").fill("ผู้ชมใจดี");
  await page.getByRole("button", { name: "50", exact: true }).click();
  await page.getByLabel("ข้อความ").fill("สู้ๆ นะ");
  await page.getByRole("button", { name: "ไปหน้าจ่ายเงิน" }).click();
  await expect(page.getByTestId("donation-qr")).toBeVisible();
  await page.getByRole("button", { name: "โอนแล้ว แนบสลิป" }).click();
}

test("แนบสลิปถูกต้อง → สำเร็จ และ alert ขึ้น overlay", async ({ page, context }) => {
  const s = await createReadyStreamer("slip-e2e");
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", s.id)
    .single();
  const overlay = await context.newPage();
  await overlay.goto(`/overlay/${data!.overlay_token}`);
  await expect(overlay.getByTestId("overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await overlay.waitForTimeout(1500);

  await donate(page, s.username);
  await page.getByLabel("เลือกรูปสลิป").setInputFiles({
    name: "slip.png",
    mimeType: "image/png",
    buffer: await slipPng(fakeSlipPayload({ data: goodSlip(5000) })),
  });
  await expect(page.getByAltText("พรีวิวสลิป")).toBeVisible();
  await page.getByRole("button", { name: "ส่งตรวจ" }).click();

  const result = page.getByTestId("slip-result");
  await expect(result).toHaveAttribute("data-status", "approved");
  await expect(result).toContainText("ขอบคุณ! โดเนทของคุณขึ้นจอแล้ว");
  await expect(page.locator('li[aria-current="step"]:visible')).toContainText(
    "แนบสลิป",
  );

  await expect(overlay.getByTestId("alert-headline")).toHaveText(
    "ผู้ชมใจดี โดเนท 50 บาท",
    { timeout: 5000 },
  );
  await expect(overlay.getByText("สู้ๆ นะ")).toBeVisible();

  // กลับมาหน้าเดิมยังเห็นผล
  await page.reload();
  await expect(result).toHaveAttribute("data-status", "approved");
});

test("รูปไม่มี QR → แนบใหม่ได้ เหลือ 2 ครั้ง; ยอดไม่ตรง → รอสตรีมเมอร์ตรวจ", async ({
  page,
}) => {
  const s = await createReadyStreamer("slip-retry");
  await donate(page, s.username);

  const blank = await sharp({
    create: { width: 400, height: 600, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("เลือกรูปสลิป").setInputFiles({
    name: "blank.png",
    mimeType: "image/png",
    buffer: blank,
  });
  await page.getByRole("button", { name: "ส่งตรวจ" }).click();
  const retry = page.getByTestId("slip-retry");
  await expect(retry).toContainText("ไม่พบ QR บนสลิป");
  await expect(retry).toContainText("แนบใหม่ได้อีก 2 ครั้ง");

  await page.getByLabel("เลือกรูปสลิป").setInputFiles({
    name: "slip.png",
    mimeType: "image/png",
    buffer: await slipPng(fakeSlipPayload({ data: goodSlip(4000) })),
  });
  await page.getByRole("button", { name: "ส่งตรวจ" }).click();
  const result = page.getByTestId("slip-result");
  await expect(result).toHaveAttribute("data-status", "pending_review");
  await expect(result).toContainText("ยอดโอนไม่ตรงกับที่กรอก");
});

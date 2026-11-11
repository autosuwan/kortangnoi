import { expect, test } from "@playwright/test";

import { loginAsStreamer } from "./helpers";

test("ตั้งค่าพร้อมเพย์ → บันทึก → reload ค่ายังอยู่", async ({ page }) => {
  await loginAsStreamer(page, "pay-e2e");
  await expect(page.getByText("ยังไม่เปิดรับโดเนท")).toBeVisible();
  await page.getByText("ยังไม่เปิดรับโดเนท").click();
  await expect(page).toHaveURL(/\/dashboard\/payment$/);

  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await expect(unsaved).toBeHidden();

  await page.getByRole("button", { name: "เพิ่มยอดขั้นต่ำ" }).click();
  await expect(page.getByLabel("ยอดขั้นต่ำ (บาท)")).toHaveValue("30");
  await page.getByLabel("เบอร์พร้อมเพย์").fill("081-234-5678");
  await page.getByLabel("ชื่อบัญชี (ภาษาไทย)").fill("นาย สมชาย ใจดี");
  await page.getByLabel("ชื่อบัญชี (ภาษาอังกฤษ)").fill("somchai jaidee");
  await page.getByRole("switch", { name: "เปิดรับโดเนท" }).click();

  await expect(unsaved).toBeVisible();
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  await page.reload();
  await expect(page.getByLabel("ยอดขั้นต่ำ (บาท)")).toHaveValue("30");
  await expect(page.getByLabel("เบอร์พร้อมเพย์")).toHaveValue("0812345678");
  await expect(page.getByLabel("ชื่อบัญชี (ภาษาไทย)")).toHaveValue("สมชาย ใจดี");
  await expect(page.getByLabel("ชื่อบัญชี (ภาษาอังกฤษ)")).toHaveValue(
    "SOMCHAI JAIDEE",
  );
  await expect(page.getByRole("switch", { name: "เปิดรับโดเนท" })).toBeChecked();

  await page.goto("/dashboard");
  await expect(page.getByText("เปิดรับโดเนทแล้ว")).toBeVisible();
});

test("เลขผิดและข้อมูลไม่ครบแสดง error, ยกเลิกคืนค่าเดิม", async ({ page }) => {
  await loginAsStreamer(page, "pay-err");
  await page.goto("/dashboard/payment");
  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });

  await page.getByRole("switch", { name: "เปิดรับโดเนท" }).click();
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(
    page.getByText("กรอกเลขพร้อมเพย์และชื่อบัญชีให้ครบก่อนเปิดรับโดเนท"),
  ).toBeVisible();

  await page.getByRole("radio", { name: "เลขบัตรประชาชน" }).click();
  await page.getByLabel("เลขบัตรประชาชน").fill("1101700230701");
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("เลขบัตรประชาชนไม่ถูกต้อง")).toBeVisible();

  await unsaved.getByRole("button", { name: "ยกเลิก" }).click();
  await expect(unsaved).toBeHidden();
  await expect(page.getByLabel("เบอร์พร้อมเพย์")).toHaveValue("");
});

test("ดูตัวอย่าง QR จากค่าที่ยังไม่บันทึก", async ({ page }) => {
  await loginAsStreamer(page, "pay-qr");
  await page.goto("/dashboard/payment");

  await page.getByRole("button", { name: "ดูตัวอย่าง QR" }).click();
  await expect(page.getByRole("dialog")).toContainText("ให้ถูกต้องก่อน");
  await page.getByRole("button", { name: "ปิด" }).click();

  await page.getByLabel("เบอร์พร้อมเพย์").fill("0812345678");
  await page.getByRole("button", { name: "ดูตัวอย่าง QR" }).click();
  await expect(page.getByTestId("qr-preview")).toBeVisible();
});

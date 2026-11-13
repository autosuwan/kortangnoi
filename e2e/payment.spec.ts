import { expect, test } from "@playwright/test";

import { adminClient } from "../test/supabase";

import { loginAsStreamer } from "./helpers";

test("ตั้งค่าครั้งแรกทีละขั้น: พร้อมเพย์ → alert → OBS → หน้าหลัก", async ({ page }) => {
  await loginAsStreamer(page, "pay-e2e");
  await page.getByRole("link", { name: /ยังไม่เปิดรับโดเนท/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/payment\?setup=1$/);
  const steps = page.getByRole("navigation", { name: "ขั้นตอนตั้งค่า" });
  await expect(steps.getByText("ขั้นที่ 1 จาก 3")).toBeVisible();
  // โหมดตั้งค่าเปิดรับโดเนทไว้ให้
  await expect(page.getByRole("switch", { name: "เปิดรับโดเนท" })).toBeChecked();

  const bar = page.getByRole("region", { name: "ไปขั้นต่อไป" });
  // ข้อมูลไม่ครบ → ไม่ไปต่อ แสดง error
  await bar.getByRole("button", { name: "บันทึกและไปขั้นต่อไป" }).click();
  await expect(
    page.getByText("กรอกเลขพร้อมเพย์และชื่อบัญชีให้ครบก่อนเปิดรับโดเนท"),
  ).toBeVisible();

  // ช่องยอดขั้นต่ำ: ลบหมดแล้วพิมพ์ใหม่ได้ตรงตามที่พิมพ์
  const min = page.getByLabel("ยอดขั้นต่ำ (บาท)");
  await min.fill("");
  await expect(min).toHaveValue("");
  await min.pressSequentially("1");
  await expect(min).toHaveValue("1");
  await min.pressSequentially("5");
  await expect(min).toHaveValue("15");
  await page.getByRole("button", { name: "เพิ่มยอดขั้นต่ำ" }).click();
  await expect(min).toHaveValue("25");
  await min.fill("");
  await min.blur();
  await expect(min).toHaveValue("1");
  await min.fill("30");

  await page.getByLabel("เบอร์พร้อมเพย์").fill("081-234-5678");
  await page.getByLabel("ชื่อบัญชี (ภาษาไทย)").fill("นาย สมชาย ใจดี");
  await page.getByLabel("ชื่อบัญชี (ภาษาอังกฤษ)").fill("somchai jaidee");
  await bar.getByRole("button", { name: "บันทึกและไปขั้นต่อไป" }).click();

  // ขั้น 2: ไม่แก้อะไรก็ไปต่อได้
  await expect(page).toHaveURL(/\/dashboard\/alert\?setup=1$/);
  await expect(steps.getByText("ขั้นที่ 2 จาก 3")).toBeVisible();
  await bar.getByRole("button", { name: "ใช้ค่านี้ ไปขั้นต่อไป" }).click();

  // ขั้น 3: ลิงก์ OBS + เสร็จ
  await expect(page).toHaveURL(/\/dashboard\/setup\/obs$/);
  await expect(page.getByTestId("overlay-url")).toBeVisible();
  await bar.getByRole("button", { name: "เสร็จแล้ว ไปหน้าหลัก" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("เปิดรับโดเนทแล้ว")).toBeVisible();

  // ค่าที่บันทึกไว้ยังอยู่ (นอกโหมดตั้งค่าใช้แถบ "ยังไม่บันทึก" แบบเดิม)
  await page.goto("/dashboard/payment");
  await expect(page.getByLabel("ยอดขั้นต่ำ (บาท)")).toHaveValue("30");
  await expect(page.getByLabel("เบอร์พร้อมเพย์")).toHaveValue("0812345678");
  await expect(page.getByLabel("ชื่อบัญชี (ภาษาไทย)")).toHaveValue("สมชาย ใจดี");
  await expect(page.getByLabel("ชื่อบัญชี (ภาษาอังกฤษ)")).toHaveValue(
    "SOMCHAI JAIDEE",
  );
  await expect(page.getByRole("switch", { name: "เปิดรับโดเนท" })).toBeChecked();
  await expect(
    page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" }),
  ).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "ขั้นตอนตั้งค่า" }),
  ).toBeHidden();
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

test("พรีวิว QR สดจากค่าที่พิมพ์ + ชื่อที่ผู้โดเนทเห็นสลับตามสวิตช์", async ({ page }) => {
  await loginAsStreamer(page, "pay-qr");
  await page.goto("/dashboard/payment");

  await expect(page.getByTestId("qr-placeholder")).toBeVisible();
  await page.getByLabel("เบอร์พร้อมเพย์").fill("081234567");
  await expect(page.getByTestId("qr-placeholder")).toBeVisible();
  await page.getByLabel("เบอร์พร้อมเพย์").fill("0812345678");
  await expect(page.getByTestId("qr-preview")).toBeVisible();

  await page.getByLabel("ชื่อบัญชี (ภาษาไทย)").fill("สมชาย ใจดี");
  await expect(page.getByTestId("qr-recipient")).toHaveText("สมชาย ใจดี");
  await page.getByRole("switch", { name: "แสดงชื่อบัญชีให้ผู้โดเนทเห็น" }).click();
  await expect(page.getByTestId("qr-recipient")).toHaveText("pay-qr");
});

test("เปิดบริจาคไม่เปิดเผยชื่อ → ผู้บริจาคติ๊กแล้วรายการเป็น Anonymous; ปิดแสดงชื่อบัญชี → ขึ้นชื่อสตรีมเมอร์", async ({
  page,
  browser,
}) => {
  const s = await loginAsStreamer(page, "pay-anon");
  await page.goto("/dashboard/payment");
  await page.getByLabel("เบอร์พร้อมเพย์").fill("0812345678");
  await page.getByLabel("ชื่อบัญชี (ภาษาไทย)").fill("สมชาย ใจดี");
  await page.getByRole("switch", { name: "เปิดรับโดเนท" }).click();
  await page.getByRole("switch", { name: "แสดงชื่อบัญชีให้ผู้โดเนทเห็น" }).click();
  await page.getByRole("switch", { name: "บริจาคโดยไม่เปิดเผยชื่อ" }).click();
  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  const donor = await (await browser.newContext()).newPage();
  await donor.goto(`/${s.username}`);
  await donor.getByLabel("ไม่เปิดเผยชื่อ").check();
  await expect(donor.getByLabel("ชื่อที่แสดง")).toBeDisabled();
  await donor.getByRole("button", { name: "ไปหน้าจ่ายเงิน" }).click();
  await expect(donor.getByTestId("donation-qr")).toBeVisible();
  await expect(donor.getByTestId("pay-recipient")).toHaveText("ผู้รับ: pay-anon");

  const { data } = await adminClient()
    .from("donations")
    .select("donor_name")
    .eq("streamer_id", s.id)
    .single();
  expect(data?.donor_name).toBe("Anonymous");
});

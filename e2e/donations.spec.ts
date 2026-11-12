import { expect, test, type Page } from "@playwright/test";

import { adminClient } from "../test/supabase";

import { donateViaApi, loginWithPassword } from "./helpers";
import { createReadyStreamer } from "../test/streamer";

async function loginStreamer(page: Page, name: string) {
  const s = await createReadyStreamer(name);
  await loginWithPassword(page, s.email);
  await page.waitForURL(/\/dashboard$/);
  return s;
}

test("หน้าหลักแสดงยอด/รอตรวจ → ประวัติ → drawer → อนุมัติ → alert ขึ้น overlay", async ({
  page,
  context,
  request,
}) => {
  const s = await loginStreamer(page, "review");
  await donateViaApi(request, s.username, "ผ่านเลย", 100, 10000);
  const pending = await donateViaApi(request, s.username, "รอตรวจนะ", 50, 4000);
  expect(pending.status).toBe("pending_review");

  await page.reload();
  await expect(page.getByTestId("today-total")).toHaveText(/^100\.00/);
  await expect(page.getByTestId("pending-count")).toHaveText("1");
  await expect(
    page.getByTestId("pending-badge").filter({ visible: true }),
  ).toContainText("1");

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

  await page.getByTestId("pending-count").click();
  await expect(page).toHaveURL(/status=pending_review/);
  await page.getByRole("button", { name: "รอตรวจนะ" }).first().click();

  const drawer = page.getByRole("dialog");
  await expect(drawer.getByTestId("verify-reasons")).toContainText(
    "ยอดในสลิปไม่ตรงกับที่กรอก",
  );
  await expect(drawer.getByTestId("sender-name")).toContainText(
    "นาย ผู้โอน จริงจริง",
  );
  await expect(drawer.getByAltText("รูปสลิป")).toBeVisible();

  await drawer.getByRole("button", { name: "อนุมัติ · ขึ้น alert" }).click();
  await expect(drawer.getByText("อนุมัติด้วยมือ", { exact: false })).toBeVisible();
  await expect(overlay.getByTestId("alert-headline")).toHaveText(
    "รอตรวจนะ โดเนท 50 บาท",
    { timeout: 5000 },
  );
  // ชื่อจริงจากสลิปไม่ขึ้นจอไลฟ์
  await expect(overlay.getByText("ผู้โอน")).toHaveCount(0);
  await expect(page.getByTestId("pending-badge")).toHaveCount(0);

  // แสดง alert ซ้ำ (รอให้ alert แรกหายก่อน)
  await expect(overlay.getByTestId("alert-headline")).toBeHidden({
    timeout: 15000,
  });
  await drawer.getByRole("button", { name: "แสดง alert อีกครั้ง" }).click();
  await expect(drawer.getByText("ส่งไป OBS แล้ว")).toBeVisible();
  await expect(overlay.getByTestId("alert-headline")).toHaveText(
    "รอตรวจนะ โดเนท 50 บาท",
    { timeout: 5000 },
  );
});

test("ปฏิเสธพร้อมเหตุผล → ผู้บริจาคเห็นเหตุผล", async ({ page, request }) => {
  const s = await loginStreamer(page, "reject-ui");
  const { donationId } = await donateViaApi(
    request,
    s.username,
    "ขอคืน",
    50,
    4000,
  );

  await page.goto(`/dashboard/donations?open=${donationId}`);
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "ปฏิเสธ" }).click();
  await drawer.getByLabel("เหตุผลที่ปฏิเสธ").fill("ยอดไม่ครบ");
  await drawer.getByRole("button", { name: "ยืนยันปฏิเสธ" }).click();
  await expect(drawer.getByText("เหตุผลที่ปฏิเสธ: ยอดไม่ครบ")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "ไม่ผ่าน" }).click();
  await expect(
    page.getByText("ขอคืน").filter({ visible: true }).first(),
  ).toBeVisible();

  const { data } = await adminClient()
    .from("donations")
    .select("status, result_message")
    .eq("id", donationId)
    .single();
  expect(data).toEqual({
    status: "rejected",
    result_message: "สตรีมเมอร์ไม่อนุมัติ: ยอดไม่ครบ",
  });
});

test("โดเนทรอตรวจเข้ามาระหว่างเปิด dashboard → toast + badge (realtime)", async ({
  page,
  request,
}) => {
  const s = await loginStreamer(page, "realtime");
  await expect(page.getByTestId("realtime-status")).toHaveAttribute(
    "data-status",
    "SUBSCRIBED",
    { timeout: 10000 },
  );
  await donateViaApi(request, s.username, "มาใหม่", 50, 4000);
  await expect(page.getByText("มีโดเนทรอตรวจ")).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByTestId("pending-badge").filter({ visible: true }),
  ).toContainText("1");
});

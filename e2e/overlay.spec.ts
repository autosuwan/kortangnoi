import { expect, test } from "@playwright/test";

import { adminClient } from "../test/supabase";

import { loginAsStreamer } from "./helpers";

async function overlayPathOf(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", userId)
    .single();
  return `/overlay/${data!.overlay_token}`;
}

test("กดทดสอบ alert ใน dashboard → overlay ขึ้น alert แล้วหายตามเวลา", async ({
  page,
  context,
}) => {
  const user = await loginAsStreamer(page, "ov-e2e");

  // ตั้งคำสนับสนุน + เวลา 3 วินาที ก่อนทดสอบ
  await page.goto("/dashboard/alert");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("คำสนับสนุน", { exact: true }).fill("ให้ค่าข้าว");
  const duration = page.getByRole("slider", { name: "ระยะเวลาแสดง (วินาที)" });
  await duration.focus();
  await page.keyboard.press("Home");
  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  // เปิด overlay ในแท็บใหม่ (เหมือน OBS)
  const overlay = await context.newPage();
  await overlay.goto(await overlayPathOf(user.id));
  await expect(overlay.getByTestId("overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  // พื้นหลังโปร่งใส
  expect(
    await overlay.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    ),
  ).toBe("rgba(0, 0, 0, 0)");
  // รอ subscribe channel
  await overlay.waitForTimeout(1500);

  await page.getByRole("button", { name: "ทดสอบ alert ใน OBS" }).click();
  await expect(page.getByText("ส่งแล้ว ดูที่ OBS ได้เลย")).toBeVisible();

  const headline = overlay.getByTestId("alert-headline");
  await expect(headline).toHaveText("ผู้ชมใจดี ให้ค่าข้าว 100 บาท", {
    timeout: 5000,
  });
  await expect(overlay.getByText("ทดสอบ alert จาก KORTANGNOI")).toBeVisible();
  await expect(headline).toBeHidden({ timeout: 6000 });

  // กดซ้ำทันที → ติด rate limit
  await page.getByRole("button", { name: "ทดสอบ alert ใน OBS" }).click();
  await page.getByRole("button", { name: "ทดสอบ alert ใน OBS" }).click();
  await expect(page.getByText("รอสักครู่แล้วลองใหม่")).toBeVisible();
});

test("ลิงก์ OBS: คัดลอกได้ ซ่อน token และสร้างใหม่แล้ว overlay เก่าใช้ไม่ได้", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const user = await loginAsStreamer(page, "ov-link");
  const oldPath = await overlayPathOf(user.id);

  const shown = page.getByTestId("overlay-url");
  await expect(shown).toContainText("/overlay/");
  await expect(shown).not.toContainText(oldPath.split("/overlay/")[1]);

  const overlay = await context.newPage();
  await overlay.goto(oldPath);
  await expect(overlay.getByTestId("overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await overlay.waitForTimeout(1500);

  await page.getByRole("button", { name: "คัดลอก" }).click();
  await expect(page.getByRole("button", { name: "คัดลอกแล้ว" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`http://localhost:3100${oldPath}`);

  await page.getByRole("button", { name: "สร้างลิงก์ใหม่" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "สร้างลิงก์ใหม่" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await overlayPathOf(user.id)).not.toBe(oldPath);

  // overlay เก่าได้ revoked ทันที
  await expect(overlay.getByText("ลิงก์ overlay ไม่ถูกต้อง")).toBeVisible({
    timeout: 5000,
  });
  // เปิดลิงก์เก่าใหม่ก็ไม่ได้
  await overlay.goto(oldPath);
  await expect(overlay.getByText("ลิงก์ overlay ไม่ถูกต้อง")).toBeVisible();
});

test("TTS: ตั้งค่า → ฟังตัวอย่าง → ทดสอบ alert แล้ว overlay โหลดเสียงอ่าน", async ({
  page,
  context,
}) => {
  const user = await loginAsStreamer(page, "tts-e2e");
  await page.goto("/dashboard/alert");
  await page.waitForLoadState("networkidle");

  await page.getByRole("switch", { name: "เปิดเสียงอ่านข้อความ" }).click();
  await page.getByRole("radio", { name: "อ่านชื่อ ยอด และข้อความ" }).click();
  await page.getByLabel("อ่านเมื่อยอดตั้งแต่ (บาท)").fill("50");
  await page
    .getByLabel("เสียง", { exact: true })
    .selectOption("th-TH-Neural2-C");

  const previewRes = page.waitForResponse("**/api/settings/alert/tts-preview");
  await page.getByRole("button", { name: "ฟังตัวอย่าง" }).click();
  const res = await previewRes;
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^audio\//);

  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("switch", { name: "เปิดเสียงอ่านข้อความ" }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "อ่านชื่อ ยอด และข้อความ" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("อ่านเมื่อยอดตั้งแต่ (บาท)")).toHaveValue("50");
  await expect(page.getByLabel("เสียง", { exact: true })).toHaveValue(
    "th-TH-Neural2-C",
  );

  const overlay = await context.newPage();
  await overlay.goto(await overlayPathOf(user.id));
  await expect(overlay.getByTestId("overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await overlay.waitForTimeout(1500);

  const speechRequest = overlay.waitForRequest(/tts-audio/);
  await page.getByRole("button", { name: "ทดสอบ alert ใน OBS" }).click();
  await expect(overlay.getByTestId("alert-headline")).toBeVisible({
    timeout: 5000,
  });
  await speechRequest;
});

test("TTS เสียง Google แปลภาษา: overlay ดึงเสียงจากเบราว์เซอร์โดยตรง", async ({
  page,
  context,
}) => {
  // จำลอง Google แปลภาษา — ไม่เรียกของจริงใน test
  const wav = await import("node:fs").then((fs) =>
    fs.readFileSync("public/sounds/alert.wav"),
  );
  const spoken: string[] = [];
  await context.route(
    "https://translate.google.com/translate_tts**",
    (route) => {
      spoken.push(new URL(route.request().url()).searchParams.get("q") ?? "");
      return route.fulfill({ contentType: "audio/wav", body: wav });
    },
  );

  const user = await loginAsStreamer(page, "tts-translate");
  await page.goto("/dashboard/alert");
  await page.waitForLoadState("networkidle");
  await page.getByRole("switch", { name: "เปิดเสียงอ่านข้อความ" }).click();
  await page.getByRole("radio", { name: "อ่านชื่อ ยอด และข้อความ" }).click();
  await expect(page.getByLabel("เสียง", { exact: true })).toHaveValue(
    "translate",
  );

  // ฟังตัวอย่าง: เล่นในเบราว์เซอร์ ไม่เรียก server
  await page.getByRole("button", { name: "ฟังตัวอย่าง" }).click();
  await expect.poll(() => spoken.length).toBeGreaterThan(0);
  expect(spoken[0]).toContain("ผู้ชมใจดี");

  const unsaved = page.getByRole("region", { name: "การแก้ไขที่ยังไม่บันทึก" });
  await unsaved.getByRole("button", { name: "บันทึก" }).click();
  await expect(unsaved).toBeHidden();

  const overlay = await context.newPage();
  await overlay.goto(await overlayPathOf(user.id));
  await expect(overlay.getByTestId("overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await overlay.waitForTimeout(1500);
  spoken.length = 0;

  await page.waitForTimeout(3100); // พ้น rate limit ของปุ่มทดสอบ
  await page.getByRole("button", { name: "ทดสอบ alert ใน OBS" }).click();
  await expect(overlay.getByTestId("alert-headline")).toBeVisible({
    timeout: 5000,
  });
  await expect
    .poll(() => spoken, { timeout: 5000 })
    .toEqual(["ผู้ชมใจดี โดเนท 100 บาท ทดสอบ alert จาก KORTANGNOI"]);
});

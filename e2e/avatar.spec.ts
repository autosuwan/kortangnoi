import { expect, test } from "@playwright/test";

import { createReadyStreamer } from "../test/streamer";
import { adminClient } from "../test/supabase";
import { loginWithPassword } from "./helpers";

// ไมค์จำลองของ Chrome (เสียง beep เป็นระยะ) + อนุญาตไมค์อัตโนมัติ แบบเดียวกับที่ตั้งใน OBS
test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      // OBS เล่นเสียง/เปิด AudioContext ได้โดยไม่ต้องคลิก
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

test("Avatar: อัปโหลด 2 รูป → OBS ฟังไมค์ สลับรูปพูด/เงียบตามเกณฑ์", async ({
  page,
  context,
}) => {
  const s = await createReadyStreamer("avatar");
  await loginWithPassword(page, s.email);
  await page.waitForURL(/\/dashboard$/);
  await page.goto("/dashboard/overlays");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Avatar" }).click();
  await expect(page.getByText("อัปโหลดรูปตอนเงียบเพื่อเริ่มใช้งาน")).toBeVisible();

  await page
    .getByLabel("อัปโหลดรูปตอนเงียบ")
    .setInputFiles("public/logo-mark.png");
  await expect(page.getByTestId("avatar-idle")).toBeVisible();
  await page
    .getByLabel("อัปโหลดรูปตอนพูด")
    .setInputFiles("public/alert-default.png");
  await expect(page.getByRole("img", { name: "รูปตอนพูด" })).toBeVisible();

  // ทดสอบไมค์ใน dashboard: มิเตอร์ขยับ
  await page.getByRole("button", { name: "เริ่มทดสอบ" }).click();
  await expect(page.getByTestId("mic-status")).toHaveText(/กำลังพูด|เงียบ/);

  // เกณฑ์ต่ำสุด → beep ทำให้ปากอ้า
  const { data } = await adminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", s.id)
    .single();
  await adminClient()
    .from("overlay_widgets")
    .update({ styles: { avatar: { threshold: 1 } } })
    .eq("user_id", s.id);
  const obs = await context.newPage();
  await obs.goto(`/overlay/${data!.overlay_token}/avatar`);
  const avatar = obs.getByTestId("avatar-widget");
  await expect(avatar).toHaveAttribute("data-mic", "on");
  // beep ของไมค์จำลองดังเป็นช่วงสั้นๆ → เช็กทุกเฟรม (poll ปกติอาจพลาด)
  await obs.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="avatar-widget"]')
        ?.getAttribute("data-speaking") === "true",
    null,
    { polling: "raf", timeout: 20000 },
  );
  await expect(obs.getByText("ไมค์ใช้ไม่ได้")).toBeHidden();

  // เกณฑ์สูงสุด → ไม่ถึง ค้างรูปเงียบ (OBS ได้ event settings แล้วโหลดใหม่)
  await adminClient()
    .from("overlay_widgets")
    .update({ styles: { avatar: { threshold: 100 } } })
    .eq("user_id", s.id);
  await obs.reload();
  await expect(avatar).toHaveAttribute("data-mic", "on");
  const everSpoke = await obs.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const el = document.querySelector('[data-testid="avatar-widget"]')!;
        let spoke = false;
        const check = () => {
          if (el.getAttribute("data-speaking") === "true") spoke = true;
        };
        const id = setInterval(check, 16);
        setTimeout(() => {
          clearInterval(id);
          resolve(spoke);
        }, 3000);
      }),
  );
  expect(everSpoke).toBe(false);
});

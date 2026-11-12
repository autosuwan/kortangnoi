import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { fakeSlipPayload, goodSlip, slipPng } from "../test/slip";

import {
  adminClient,
  createTestUser,
  TEST_PASSWORD,
  uniqueUsername,
} from "../test/supabase";

export async function loginWithPassword(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบด้วยรหัสผ่าน" }).click();
}

/** ผู้ใช้ที่ตั้ง username แล้ว ล็อกอินอยู่ที่ /dashboard */
export async function loginAsStreamer(page: Page, name = "streamer") {
  const user = await createTestUser(name);
  const username = uniqueUsername("st");
  const { error } = await adminClient()
    .from("profiles")
    .update({ username, display_name: name })
    .eq("id", user.id);
  if (error) throw error;

  await loginWithPassword(page, user.email);
  await page.waitForURL(/\/dashboard$/);
  return { ...user, username };
}

/** ผู้ชมโดเนท + แนบสลิปผ่าน API จริง; slipAmountSatang ไม่ตรงยอด → รอตรวจ */
export async function donateViaApi(
  request: APIRequestContext,
  username: string,
  donorName: string,
  amountBaht: number,
  slipAmountSatang: number,
) {
  const created = await request.post(`/api/public/${username}/donations`, {
    data: { donorName, amount: String(amountBaht), message: "สู้ๆ นะ" },
    headers: { "x-forwarded-for": `10.5.${Math.floor(Math.random() * 255)}.1` },
  });
  expect(created.status()).toBe(201);
  const { donationId, accessToken } = await created.json();
  const slip = await request.post(
    `/api/public/donations/${donationId}/slip?t=${accessToken}`,
    {
      multipart: {
        file: {
          name: "slip.png",
          mimeType: "image/png",
          buffer: await slipPng(
            fakeSlipPayload({ data: goodSlip(slipAmountSatang) }),
          ),
        },
      },
    },
  );
  expect(slip.ok()).toBe(true);
  return { donationId, status: (await slip.json()).status as string };
}

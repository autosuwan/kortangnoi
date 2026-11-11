import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEFAULT_ALERT_SETTINGS } from "@/lib/alert-settings";
import {
  adminClient,
  createTestUser,
  signedInClient,
} from "../../../test/supabase";

import {
  getAlertSettings,
  updateAlertSettings,
  uploadAlertMedia,
} from "./alert";

const png = readFileSync("public/alert-default.png");
const pngFile = (name = "cat.png") =>
  new File([png], name, { type: "image/png" });

async function storagePath(userId: string) {
  const { data } = await adminClient()
    .from("alert_settings")
    .select("media_storage_path")
    .eq("user_id", userId)
    .single();
  return data?.media_storage_path ?? null;
}

async function fileExists(path: string) {
  const [folder, name] = path.split("/");
  const { data } = await adminClient()
    .storage.from("alert-media")
    .list(folder, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

describe("alert settings service", () => {
  it("ค่าเริ่มต้นของผู้ใช้ใหม่", async () => {
    const user = await createTestUser("alert-default");
    expect(await getAlertSettings(user.id)).toEqual(DEFAULT_ALERT_SETTINGS);
  });

  it("บันทึกเวลา/เสียง/ข้อความ (สีเก็บเป็นตัวพิมพ์ใหญ่)", async () => {
    const user = await createTestUser("alert-update");
    const saved = await updateAlertSettings(user.id, {
      durationSec: 12,
      soundEnabled: false,
      volume: 30,
      supportText: "ให้ค่าข้าว",
      nameColor: "#38bdf8",
    });
    expect(saved).toEqual({
      ...DEFAULT_ALERT_SETTINGS,
      durationSec: 12,
      soundEnabled: false,
      volume: 30,
      supportText: "ให้ค่าข้าว",
      nameColor: "#38BDF8",
    });
  });

  it("ค่าผิดช่วง → ALERT_SETTINGS_INVALID", async () => {
    const user = await createTestUser("alert-invalid");
    await expect(
      updateAlertSettings(user.id, {
        durationSec: 30,
        soundEnabled: true,
        volume: 80,
        supportText: "โดเนท",
        nameColor: "#FACC15",
      }),
    ).rejects.toMatchObject({ status: 400, code: "ALERT_SETTINGS_INVALID" });
  });

  it("อัปโหลดใหม่ลบไฟล์เก่า และใช้ค่าเริ่มต้นลบไฟล์ทิ้ง", async () => {
    const user = await createTestUser("alert-upload");

    const first = await uploadAlertMedia(user.id, pngFile());
    expect(first.mediaType).toBe("upload");
    expect(first.mediaUrl).toMatch(/\/alert-media\/.+\.png$/);
    const firstPath = (await storagePath(user.id))!;
    expect(firstPath.startsWith(`${user.id}/`)).toBe(true);
    expect(await fileExists(firstPath)).toBe(true);

    // ชื่อไฟล์เป็น .gif แต่เนื้อในเป็น png → เก็บเป็น .png ตาม magic bytes
    await uploadAlertMedia(user.id, pngFile("fake.gif"));
    const secondPath = (await storagePath(user.id))!;
    expect(secondPath).toMatch(/\.png$/);
    expect(await fileExists(firstPath)).toBe(false);

    const reset = await updateAlertSettings(user.id, {
      mediaType: "default",
      durationSec: 8,
      soundEnabled: true,
      volume: 80,
      supportText: "โดเนท",
      nameColor: "#FACC15",
    });
    expect(reset).toEqual(DEFAULT_ALERT_SETTINGS);
    expect(await fileExists(secondPath)).toBe(false);
  });

  it("เลือก GIF จาก KLIPY ลบไฟล์อัปโหลดเก่า และเก็บ URL ตามเดิม", async () => {
    const user = await createTestUser("alert-gif");
    await uploadAlertMedia(user.id, pngFile());
    const uploaded = (await storagePath(user.id))!;

    const gifUrl = "https://static.klipy.com/ii/abc/14/af/um0L4dFH.gif";
    const saved = await updateAlertSettings(user.id, {
      mediaType: "gif",
      mediaUrl: gifUrl,
      durationSec: 8,
      soundEnabled: true,
      volume: 80,
      supportText: "โดเนท",
      nameColor: "#FACC15",
    });
    expect(saved).toMatchObject({ mediaType: "gif", mediaUrl: gifUrl });
    expect(await storagePath(user.id)).toBeNull();
    expect(await fileExists(uploaded)).toBe(false);
  });

  it.each([
    "https://evil.example/x.gif",
    "http://static.klipy.com/x.gif",
    "https://static.klipy.com.evil.example/x.gif",
  ])("GIF นอก allowlist ถูกปฏิเสธ: %s", async (mediaUrl) => {
    const user = await createTestUser("alert-gif-bad");
    await expect(
      updateAlertSettings(user.id, {
        mediaType: "gif",
        mediaUrl,
        durationSec: 8,
        soundEnabled: true,
        volume: 80,
        supportText: "โดเนท",
        nameColor: "#FACC15",
      }),
    ).rejects.toMatchObject({ status: 400, code: "MEDIA_URL_NOT_ALLOWED" });
  });

  it("ไฟล์ที่ไม่ใช่รูปถูกปฏิเสธ", async () => {
    const user = await createTestUser("alert-fake");
    const fake = new File(["<svg onload=alert(1)>"], "x.png", {
      type: "image/png",
    });
    await expect(uploadAlertMedia(user.id, fake)).rejects.toMatchObject({
      status: 400,
      code: "MEDIA_INVALID",
    });
  });

  it("ไฟล์เกิน 4 MB ถูกปฏิเสธ", async () => {
    const user = await createTestUser("alert-big");
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png");
    await expect(uploadAlertMedia(user.id, big)).rejects.toMatchObject({
      code: "MEDIA_INVALID",
    });
  });
});

it("CHECK ใน DB กันคำสนับสนุนว่างและสีผิดรูปแบบ", async () => {
  const user = await createTestUser("alert-check");
  for (const patch of [{ support_text: "  " }, { name_color: "#fff" }]) {
    const { error } = await adminClient()
      .from("alert_settings")
      .update(patch)
      .eq("user_id", user.id);
    expect(error?.code, JSON.stringify(patch)).toBe("23514");
  }
});

describe("alert_settings / storage สิทธิ์ client", () => {
  it("แก้ alert_settings ตรงไม่ได้ และอัปโหลดเข้า bucket ตรงไม่ได้", async () => {
    const user = await createTestUser("alert-direct");
    const client = await signedInClient(user.email);

    const { error } = await client
      .from("alert_settings")
      .update({ volume: 1 })
      .eq("user_id", user.id);
    expect(error?.code).toBe("42501");

    const upload = await client.storage
      .from("alert-media")
      .upload(`${user.id}/x.png`, png, { contentType: "image/png" });
    expect(upload.error).not.toBeNull();
  });
});

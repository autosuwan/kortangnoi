import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createReadyStreamer } from "../../../test/streamer";
import {
  adminClient,
  createTestUser,
  signedInClient,
  uniqueUsername,
} from "../../../test/supabase";

import { getPublicStreamer } from "./donation";
import {
  getProfileSettings,
  removeProfileImage,
  setUsername,
  updateProfile,
  uploadProfileImage,
} from "./profile";

const png = () =>
  new File([readFileSync("public/logo-mark.png")], "a.png", {
    type: "image/png",
  });

async function mediaExists(url: string | null) {
  return url ? (await fetch(url)).status === 200 : false;
}

describe("ตั้งค่าโปรไฟล์", () => {
  it("ตั้ง username ครั้งแรก → ชื่อที่แสดง = username; ชื่อจริงมาจาก auth", async () => {
    const user = await createTestUser("realname");
    const username = uniqueUsername("p");
    await setUsername(user.id, username);
    expect(await getProfileSettings(user.id)).toMatchObject({
      username,
      displayName: username,
      realName: "realname",
    });
    // เปลี่ยน username ทีหลัง ไม่ทับชื่อที่แสดงที่มีอยู่แล้ว
    await setUsername(user.id, `${username}x`);
    expect((await getProfileSettings(user.id)).displayName).toBe(username);
  });

  it("แก้ชื่อที่แสดง + แนะนำตัว (validate)", async () => {
    const s = await createReadyStreamer("prof-update");
    const saved = await updateProfile(s.id, {
      displayName: "  แมว เหมียว ",
      bio: "สตรีมเกมทุกคืน",
    });
    expect(saved).toMatchObject({
      displayName: "แมว เหมียว",
      bio: "สตรีมเกมทุกคืน",
    });
    await expect(
      updateProfile(s.id, { displayName: "" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "DISPLAY_NAME_INVALID",
    });
  });

  it("อัปโหลดรูปโปรไฟล์/แบนเนอร์ ลบไฟล์เก่า และลบรูปได้; ไฟล์ปลอมถูกปฏิเสธ", async () => {
    const s = await createReadyStreamer("prof-media");
    const first = await uploadProfileImage(s.id, "avatar", png());
    expect(await mediaExists(first.avatarUrl)).toBe(true);
    const second = await uploadProfileImage(s.id, "avatar", png());
    expect(second.avatarUrl).not.toBe(first.avatarUrl);
    expect(await mediaExists(first.avatarUrl)).toBe(false);

    const banner = await uploadProfileImage(s.id, "banner", png());
    expect(await mediaExists(banner.bannerUrl)).toBe(true);
    const removed = await removeProfileImage(s.id, "banner");
    expect(removed.bannerUrl).toBeNull();
    expect(await mediaExists(banner.bannerUrl)).toBe(false);

    await expect(
      uploadProfileImage(s.id, "avatar", new File(["<svg/>"], "x.png")),
    ).rejects.toMatchObject({ status: 400, code: "MEDIA_INVALID" });
  });

  it("หน้าโดเนท (สาธารณะ) มีรูป/แบนเนอร์/bio แต่ไม่มีชื่อจริง", async () => {
    const user = await createTestUser("RealNameSecret");
    const username = uniqueUsername("p");
    await setUsername(user.id, username);
    await updateProfile(user.id, { displayName: "แมวส้ม", bio: "สวัสดี" });
    await uploadProfileImage(user.id, "avatar", png());

    const pub = await getPublicStreamer(username);
    expect(pub).toMatchObject({ displayName: "แมวส้ม", bio: "สวัสดี" });
    expect(pub!.avatarUrl).toMatch(/profile-media/);
    expect(JSON.stringify(pub)).not.toContain("RealNameSecret");
  });

  it("client แก้ profiles ตรงไม่ได้", async () => {
    const s = await createReadyStreamer("prof-direct");
    const client = await signedInClient(s.email);
    const { error } = await client
      .from("profiles")
      .update({ display_name: "hack" })
      .eq("id", s.id);
    expect(error?.code).toBe("42501");
    const { data } = await adminClient()
      .from("profiles")
      .select("display_name")
      .eq("id", s.id)
      .single();
    expect(data?.display_name).toBe("prof-direct");
  });
});

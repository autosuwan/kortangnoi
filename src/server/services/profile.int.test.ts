import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/api-error";
import {
  adminClient,
  anonClient,
  createTestUser,
  signedInClient,
  uniqueUsername,
} from "../../../test/supabase";

import { getMe, isUsernameAvailable, setUsername } from "./profile";

describe("สร้างผู้ใช้ใหม่", () => {
  it("trigger สร้าง profile และ settings ครบทั้ง 3 ตาราง", async () => {
    const user = await createTestUser("newbie");
    const admin = adminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name, overlay_token")
      .eq("id", user.id)
      .single();
    expect(profile).toMatchObject({ username: null, display_name: "newbie" });
    expect(profile?.overlay_token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    for (const table of [
      "payment_settings",
      "alert_settings",
      "webhook_settings",
    ] as const) {
      const { count } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      expect(count, table).toBe(1);
    }
  });
});

describe("setUsername", () => {
  it("บันทึกเป็นตัวเล็ก และ getMe คืนค่าที่บันทึก", async () => {
    const user = await createTestUser();
    const name = uniqueUsername("Cap");
    await expect(setUsername(user.id, name)).resolves.toEqual({
      username: name.toLowerCase(),
    });
    await expect(getMe(user.id)).resolves.toMatchObject({
      username: name.toLowerCase(),
    });
  });

  it("username ซ้ำ → 409 USERNAME_TAKEN", async () => {
    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    const name = uniqueUsername();
    await setUsername(a.id, name);

    const error = await setUsername(b.id, name).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 409, code: "USERNAME_TAKEN" });
  });

  it("จองชื่อเดียวกันพร้อมกัน สำเร็จแค่คนเดียว", async () => {
    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    const name = uniqueUsername();
    const results = await Promise.allSettled([
      setUsername(a.id, name),
      setUsername(b.id, name),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("คำสงวน → 400 USERNAME_INVALID", async () => {
    const user = await createTestUser();
    await expect(setUsername(user.id, "dashboard")).rejects.toMatchObject({
      status: 400,
      code: "USERNAME_INVALID",
    });
  });
});

describe("isUsernameAvailable", () => {
  it("ชื่อของตัวเองถือว่าว่าง ชื่อของคนอื่นไม่ว่าง", async () => {
    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    const name = uniqueUsername();
    await setUsername(a.id, name);

    await expect(isUsernameAvailable(name, a.id)).resolves.toBe(true);
    await expect(isUsernameAvailable(name, b.id)).resolves.toBe(false);
    await expect(isUsernameAvailable(uniqueUsername(), b.id)).resolves.toBe(
      true,
    );
  });
});

describe("Row Level Security", () => {
  it("อ่าน profile ของคนอื่นไม่ได้", async () => {
    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    const clientA = await signedInClient(a.email);

    const { data: own } = await clientA
      .from("profiles")
      .select("id")
      .eq("id", a.id);
    const { data: other } = await clientA
      .from("profiles")
      .select("id")
      .eq("id", b.id);
    expect(own).toHaveLength(1);
    expect(other).toHaveLength(0);
  });

  it("แก้ overlay_token เองไม่ได้", async () => {
    const user = await createTestUser();
    const client = await signedInClient(user.email);
    const { error } = await client
      .from("profiles")
      .update({ overlay_token: "hacked" })
      .eq("id", user.id);
    expect(error?.code).toBe("42501"); // permission denied
  });

  it("anon อ่านตาราง settings ไม่ได้", async () => {
    const { error } = await anonClient().from("payment_settings").select("*");
    expect(error?.code).toBe("42501");
  });
});

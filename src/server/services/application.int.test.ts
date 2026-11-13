import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createReadyStreamer } from "../../../test/streamer";
import {
  adminClient,
  createTestUser,
  signedInClient,
} from "../../../test/supabase";
import { getStreamerStatus } from "../auth";
import { changeUserStatus, getUserDetail, listUsers } from "./admin";
import { getMyApplication, submitApplication } from "./application";
import { createDonation, getPublicStreamer } from "./donation";

const ADMIN = "00000000-0000-4000-8000-00000000ad01";
const png = () =>
  new File([readFileSync("public/logo-mark.png")], "a.png", {
    type: "image/png",
  });
const fields = {
  realName: "สมชาย ใจดี",
  phone: "081-234-5678",
  channelUrls: ["https://www.twitch.tv/somchai"],
  pdpa: true,
};

describe("F15 สมัครเป็นสตรีมเมอร์", () => {
  it("ผู้ใช้ใหม่ยังไม่อนุมัติ → ส่งใบสมัคร → รอตรวจ → อนุมัติ", async () => {
    const u = await createTestUser("apply", { status: "pending_application" });
    expect(await getStreamerStatus(u.id)).toBe("pending_application");

    await expect(
      submitApplication(u.id, { ...fields, pdpa: false }, [png()]),
    ).rejects.toMatchObject({ status: 400, code: "PDPA_REQUIRED" });
    await expect(submitApplication(u.id, fields, [])).rejects.toMatchObject({
      status: 400,
      code: "APPLICATION_INVALID",
    });
    await expect(
      submitApplication(u.id, fields, [new File(["<svg/>"], "x.png")]),
    ).rejects.toMatchObject({ status: 400 });

    const sent = await submitApplication(u.id, fields, [png(), png()]);
    expect(sent.status).toBe("pending");
    expect(sent.application).toMatchObject({
      realName: "สมชาย ใจดี",
      phone: "0812345678",
      pdpaVersion: expect.any(String),
    });
    expect(sent.application!.imageUrls).toHaveLength(2);

    // แอดมินเห็นในรายการรอตรวจ
    const pending = await listUsers({ status: "pending" });
    expect(pending.items.some((r) => r.id === u.id)).toBe(true);

    const approved = await changeUserStatus(ADMIN, u.id, "approve", {});
    expect(approved.status).toBe("approved");
    expect(await getStreamerStatus(u.id)).toBe("approved");
    // อนุมัติแล้วส่งใบสมัครไม่ได้
    await expect(
      submitApplication(u.id, fields, [png()]),
    ).rejects.toMatchObject({ status: 409, code: "APPLICATION_LOCKED" });
    // กดซ้ำ → 409
    await expect(
      changeUserStatus(ADMIN, u.id, "approve", {}),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("ไม่อนุมัติ → เห็นเหตุผล → ส่งใหม่ได้ (รูปเก่าถูกลบ)", async () => {
    const u = await createTestUser("apply2", { status: "pending_application" });
    await submitApplication(u.id, fields, [png()]);
    const firstPaths = (
      await adminClient()
        .from("streamer_applications")
        .select("image_paths")
        .eq("user_id", u.id)
        .single()
    ).data!.image_paths;

    await changeUserStatus(ADMIN, u.id, "reject", { note: "ลิงก์เปิดไม่ได้" });
    expect(await getMyApplication(u.id)).toMatchObject({
      status: "rejected",
      note: "ลิงก์เปิดไม่ได้",
    });

    const again = await submitApplication(u.id, fields, [png()]);
    expect(again).toMatchObject({ status: "pending", note: null });
    const { data } = await adminClient()
      .storage.from("applications")
      .list(u.id);
    const names = (data ?? []).map((f) => `${u.id}/${f.name}`);
    expect(names).not.toContain(firstPaths[0]);
    expect(names).toHaveLength(1);
  });

  it("ระงับ → ปิดรับโดเนท; ยกเลิกระงับ → เปิดกลับ; แอดมินระงับตัวเองไม่ได้", async () => {
    const s = await createReadyStreamer("suspend");
    await changeUserStatus(ADMIN, s.id, "suspend", { note: "สแปม" });
    expect((await getPublicStreamer(s.username))!.enabled).toBe(false);
    await expect(
      createDonation(
        s.username,
        { donorName: "แมว", amount: "50" },
        "10.1.1.1",
      ),
    ).rejects.toMatchObject({ status: 409, code: "DONATIONS_DISABLED" });
    expect(await getUserDetail(s.id)).toMatchObject({
      status: "suspended",
      note: "สแปม",
    });

    await changeUserStatus(ADMIN, s.id, "unsuspend", {});
    expect((await getPublicStreamer(s.username))!.enabled).toBe(true);

    await expect(
      changeUserStatus(ADMIN, ADMIN, "suspend", {}),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      changeUserStatus(ADMIN, s.id, "nope", {}),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("RLS: เห็นใบสมัครตัวเองเท่านั้น, เขียนตรง/อ่านรูปตรงไม่ได้", async () => {
    const a = await createTestUser("rlsa", { status: "pending_application" });
    const b = await createTestUser("rlsb", { status: "pending_application" });
    await submitApplication(a.id, fields, [png()]);
    await submitApplication(b.id, fields, [png()]);

    const client = await signedInClient(a.email);
    const { data } = await client.from("streamer_applications").select("*");
    expect((data ?? []).map((r) => r.user_id)).toEqual([a.id]);

    await client
      .from("streamer_applications")
      .update({ phone: "0899999999" })
      .eq("user_id", a.id);
    await client
      .from("profiles")
      .update({ streamer_status: "approved" })
      .eq("id", a.id);
    expect(await getStreamerStatus(a.id)).toBe("pending");

    const files = await client.storage.from("applications").list(a.id);
    expect(files.data ?? []).toHaveLength(0);
  });
});

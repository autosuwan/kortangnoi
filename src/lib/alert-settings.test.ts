import { describe, expect, it } from "vitest";

import {
  alertImageUrl,
  DEFAULT_ALERT_SETTINGS,
  effectiveAlertStyle,
  resolveDonorAlertStyle,
  alertSettingsUpdateSchema,
  DEFAULT_ALERT_IMAGE,
} from "./alert-settings";

const valid = {
  durationSec: 8,
  soundEnabled: true,
  volume: 80,
  supportText: "ให้ค่าข้าว",
  nameColor: "#FACC15",
  donorCanPickImage: false,
  donorCanPickColor: true,
  donorCanPickSupportText: false,
};

describe("alertSettingsUpdateSchema", () => {
  it("รับค่าปกติ และ mediaType default", () => {
    expect(alertSettingsUpdateSchema.safeParse(valid).success).toBe(true);
    expect(
      alertSettingsUpdateSchema.safeParse({ ...valid, mediaType: "default" })
        .success,
    ).toBe(true);
    expect(
      alertSettingsUpdateSchema.safeParse({
        ...valid,
        mediaType: "gif",
        mediaUrl: "https://static.klipy.com/ii/a.gif",
      }).success,
    ).toBe(true);
  });

  it.each([
    { durationSec: 2 },
    { durationSec: 21 },
    { durationSec: 5.5 },
    { volume: -1 },
    { volume: 101 },
    { mediaType: "upload" },
    { supportText: "" },
    { supportText: "   " },
    { supportText: "ก".repeat(41) },
    { nameColor: "red" },
    { nameColor: "#FFF" },
    { nameColor: "#GGGGGG" },
    { mediaType: "gif" },
  ])("ปฏิเสธ %o", (patch) => {
    expect(
      alertSettingsUpdateSchema.safeParse({ ...valid, ...patch }).success,
    ).toBe(false);
  });
});

it("alertImageUrl ใช้รูปเริ่มต้นเมื่อไม่มีรูป", () => {
  expect(alertImageUrl({ mediaType: "default", mediaUrl: "x" })).toBe(
    DEFAULT_ALERT_IMAGE,
  );
  expect(alertImageUrl({ mediaType: "upload", mediaUrl: null })).toBe(
    DEFAULT_ALERT_IMAGE,
  );
  expect(
    alertImageUrl({ mediaType: "upload", mediaUrl: "https://a/b.gif" }),
  ).toBe("https://a/b.gif");
});

it("normalize คำสนับสนุนและสี", () => {
  const r = alertSettingsUpdateSchema.parse({
    ...valid,
    supportText: "  ให้\u0007ค่า   ข้าว \n",
    nameColor: "#38bdf8",
  });
  expect(r.supportText).toBe("ให้ค่า ข้าว");
  expect(r.nameColor).toBe("#38BDF8");
});

describe("resolveDonorAlertStyle", () => {
  const all = {
    donorCanPickImage: true,
    donorCanPickColor: true,
    donorCanPickSupportText: true,
  };
  const choice = {
    mediaUrl: "https://static.klipy.com/ii/a.gif",
    nameColor: "#38bdf8",
    supportText: "  ให้ค่าขนม ",
  };

  it("ใช้ค่าของผู้บริจาคเมื่อเปิดให้เลือก", () => {
    expect(resolveDonorAlertStyle(all, choice)).toEqual({
      mediaUrl: "https://static.klipy.com/ii/a.gif",
      nameColor: "#38BDF8",
      supportText: "ให้ค่าขนม",
    });
  });

  it("ทิ้งส่วนที่สตรีมเมอร์ไม่ได้เปิด", () => {
    expect(resolveDonorAlertStyle(DEFAULT_ALERT_SETTINGS, choice)).toEqual({
      mediaUrl: null,
      nameColor: null,
      supportText: null,
    });
  });

  it.each([
    { mediaUrl: "https://evil.example/x.gif" },
    { mediaUrl: "https://my-bucket.supabase.co/alert-media/x.png" },
    { mediaUrl: 123 },
    { nameColor: "red" },
    { nameColor: "#FFF" },
    { supportText: "" },
    { supportText: "ก".repeat(41) },
    { supportText: ["array"] },
  ])("ทิ้งค่าที่ไม่ผ่าน validation %o", (bad) => {
    const r = resolveDonorAlertStyle(all, bad);
    expect(r).toEqual({ mediaUrl: null, nameColor: null, supportText: null });
  });

  it("ไม่มีตัวเลือก → null ทั้งหมด", () => {
    expect(resolveDonorAlertStyle(all, undefined)).toEqual({
      mediaUrl: null,
      nameColor: null,
      supportText: null,
    });
  });
});

it("effectiveAlertStyle ใช้ค่าของผู้บริจาคก่อน ไม่มีก็ใช้ของสตรีมเมอร์", () => {
  const settings = { ...DEFAULT_ALERT_SETTINGS, supportText: "ให้ค่าข้าว" };
  expect(effectiveAlertStyle(settings, null)).toEqual({
    imageUrl: DEFAULT_ALERT_IMAGE,
    nameColor: "#FACC15",
    supportText: "ให้ค่าข้าว",
  });
  expect(
    effectiveAlertStyle(settings, {
      mediaUrl: null,
      nameColor: "#38BDF8",
      supportText: null,
    }),
  ).toEqual({
    imageUrl: DEFAULT_ALERT_IMAGE,
    nameColor: "#38BDF8",
    supportText: "ให้ค่าข้าว",
  });
});

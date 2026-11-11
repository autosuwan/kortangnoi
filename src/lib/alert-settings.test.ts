import { describe, expect, it } from "vitest";

import {
  alertImageUrl,
  alertSettingsUpdateSchema,
  DEFAULT_ALERT_IMAGE,
} from "./alert-settings";

const valid = { durationSec: 8, soundEnabled: true, volume: 80 };

describe("alertSettingsUpdateSchema", () => {
  it("รับค่าปกติ และ mediaType default", () => {
    expect(alertSettingsUpdateSchema.safeParse(valid).success).toBe(true);
    expect(
      alertSettingsUpdateSchema.safeParse({ ...valid, mediaType: "default" })
        .success,
    ).toBe(true);
  });

  it.each([
    { durationSec: 2 },
    { durationSec: 21 },
    { durationSec: 5.5 },
    { volume: -1 },
    { volume: 101 },
    { mediaType: "upload" },
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

import { describe, expect, it } from "vitest";

import { validateApplication } from "./application";

const valid = {
  realName: "  สมชาย   ใจดี ",
  phone: "081-234 5678",
  channelUrls: ["https://www.twitch.tv/somchai"],
  pdpa: true,
};

describe("validateApplication", () => {
  it("ผ่าน + normalize ชื่อและเบอร์", () => {
    const r = validateApplication(valid);
    expect(r).toEqual({
      ok: true,
      value: { ...valid, realName: "สมชาย ใจดี", phone: "0812345678" },
    });
  });

  it.each([
    [{ realName: "ก" }, "realName"],
    [{ phone: "0212345678" }, "phone"],
    [{ phone: "08123456" }, "phone"],
    [{ channelUrls: [] }, "channelUrls"],
    [{ channelUrls: ["http://twitch.tv/x"] }, "channelUrls"],
    [{ channelUrls: ["javascript:alert(1)"] }, "channelUrls"],
    [{ channelUrls: Array(4).fill("https://a.com") }, "channelUrls"],
    [{ pdpa: false }, "pdpa"],
  ])("%o → %s", (patch, field) => {
    const r = validateApplication({ ...valid, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe(field);
  });
});

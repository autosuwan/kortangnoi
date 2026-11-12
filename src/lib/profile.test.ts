import { describe, expect, it } from "vitest";

import { initialOf, validateProfileUpdate } from "./profile";

describe("validateProfileUpdate", () => {
  it("normalize ชื่อและ bio", () => {
    expect(
      validateProfileUpdate({ displayName: "  แมว\nเหมียว ", bio: "  " }),
    ).toEqual({
      ok: true,
      value: { displayName: "แมว เหมียว", bio: null },
    });
  });

  it.each([
    [{ displayName: "" }, "DISPLAY_NAME_INVALID"],
    [{ displayName: "ก".repeat(41) }, "DISPLAY_NAME_INVALID"],
    [{ displayName: "ok", bio: "ก".repeat(161) }, "BIO_INVALID"],
    [{ displayName: 5 }, "PROFILE_INVALID"],
    [null, "PROFILE_INVALID"],
  ])("%o → %s", (input, code) => {
    const r = validateProfileUpdate(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });
});

it("initialOf", () => {
  expect(initialOf("meow")).toBe("M");
  expect(initialOf("แมว")).toBe("ม");
  expect(initialOf("ไก่")).toBe("ก");
  expect(initialOf("สมชาย")).toBe("ส");
  expect(initialOf(" ")).toBe("?");
});

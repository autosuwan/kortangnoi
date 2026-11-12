import { describe, expect, it } from "vitest";

import { parseQuota, quotaLevel } from "./slipok-quota";

describe("parseQuota", () => {
  it("แปลง response ของ SlipOK", () => {
    expect(
      parseQuota({
        quota: 97,
        overQuota: 0,
        specialQuota: 0,
        endDate: "2026-12-31",
        specialEndDate: null,
      }),
    ).toEqual({
      quota: 97,
      overQuota: 0,
      specialQuota: 0,
      endDate: "2026-12-31",
      specialEndDate: null,
    });
  });

  it("response แปลก → null", () => {
    expect(parseQuota(null)).toBeNull();
    expect(parseQuota({ quota: "100" })).toBeNull();
  });
});

describe("quotaLevel", () => {
  const base = {
    overQuota: 0,
    specialQuota: 0,
    endDate: null,
    specialEndDate: null,
  };
  it.each([
    [{ ...base, quota: 50 }, "ok"],
    [{ ...base, quota: 19 }, "low"],
    [{ ...base, quota: 0 }, "empty"],
    [{ ...base, quota: 0, specialQuota: 30 }, "ok"],
    [{ ...base, quota: 0, overQuota: 3 }, "empty"],
  ] as const)("%o → %s", (q, level) => {
    expect(quotaLevel(q)).toBe(level);
  });
});

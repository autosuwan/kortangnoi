import { describe, expect, it } from "vitest";

import { isKlipyMediaUrl, klipyCustomerId, parseGifResponse } from "./klipy";

const file = (name: string) => ({
  gif: {
    url: `https://static.klipy.com/ii/x/${name}.gif`,
    width: 220,
    height: 200,
  },
  webp: {
    url: `https://static.klipy.com/ii/x/${name}.webp`,
    width: 220,
    height: 200,
  },
});

describe("parseGifResponse", () => {
  it("ใช้ md เป็นรูปหลัก sm เป็นภาพย่อ คงลำดับ และบอกหน้าถัดไป", () => {
    const page = parseGifResponse({
      result: true,
      data: {
        current_page: 2,
        has_next: true,
        data: [
          {
            id: 1,
            slug: "a",
            title: "A",
            file: { md: file("a-md"), sm: file("a-sm") },
          },
          { id: 2, slug: "ad", type: "ad" }, // โฆษณาไม่มีไฟล์ → ข้าม
          { id: 3, slug: "b", title: "B", file: { sm: file("b-sm") } },
        ],
      },
    });
    expect(page.nextPage).toBe(3);
    expect(page.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(page.items[0]).toMatchObject({
      url: "https://static.klipy.com/ii/x/a-md.gif",
      previewUrl: "https://static.klipy.com/ii/x/a-sm.gif",
    });
    expect(page.items[1].url).toBe("https://static.klipy.com/ii/x/b-sm.gif");
  });

  it("ไม่มีหน้าถัดไป / response แปลก", () => {
    expect(parseGifResponse({ data: { has_next: false, data: [] } })).toEqual({
      items: [],
      nextPage: null,
    });
    expect(parseGifResponse({})).toEqual({ items: [], nextPage: null });
  });

  it("ข้าม URL ที่ไม่ใช่โดเมน KLIPY", () => {
    const page = parseGifResponse({
      data: {
        data: [
          {
            id: 1,
            file: { md: { gif: { url: "https://evil.example/x.gif" } } },
          },
        ],
      },
    });
    expect(page.items).toEqual([]);
  });
});

describe("isKlipyMediaUrl", () => {
  it.each([
    ["https://static.klipy.com/ii/a.gif", true],
    ["https://static2.klipy.com/ii/a.webp", true],
    ["http://static.klipy.com/ii/a.gif", false],
    ["https://static.klipy.com.evil.com/a.gif", false],
    ["https://evil.com/static.klipy.com/a.gif", false],
    ["javascript:alert(1)", false],
    ["not a url", false],
  ])("%s → %s", (url, ok) => {
    expect(isKlipyMediaUrl(url)).toBe(ok);
  });
});

it("klipyCustomerId คงที่และไม่ใช่ user id ตรงๆ", async () => {
  const id = "3f1c2a3b-0000-4000-8000-000000000000";
  const a = await klipyCustomerId(id);
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(a).toBe(await klipyCustomerId(id));
  expect(a).not.toContain("3f1c2a3b");
});

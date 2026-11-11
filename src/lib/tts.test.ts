import { describe, expect, it } from "vitest";

import {
  buildTtsText,
  cleanForSpeech,
  speakAmount,
  splitForSpeech,
  translateTtsUrls,
} from "./tts";

const base = {
  enabled: true,
  mode: "message" as const,
  minAmountSatang: 2000,
  donorName: "สมชาย",
  supportText: "ให้ค่าข้าว",
  amountSatang: 10000,
  message: "สู้ๆ นะ",
};

describe("buildTtsText", () => {
  it("โหมดข้อความ อ่านเฉพาะข้อความ", () => {
    expect(buildTtsText(base)).toBe("สู้ๆ นะ");
  });

  it("โหมดเต็ม อ่านชื่อ คำสนับสนุน ยอด แล้วข้อความ", () => {
    expect(buildTtsText({ ...base, mode: "full" })).toBe(
      "สมชาย ให้ค่าข้าว 100 บาท สู้ๆ นะ",
    );
    expect(
      buildTtsText({
        ...base,
        mode: "full",
        message: null,
        amountSatang: 12350,
      }),
    ).toBe("สมชาย ให้ค่าข้าว 123 บาท 50 สตางค์");
  });

  it.each([
    ["ปิดไว้", { enabled: false }],
    ["ยอดต่ำกว่าขั้นต่ำ", { amountSatang: 1999 }],
    ["โหมดข้อความแต่ไม่มีข้อความ", { message: null }],
    ["ข้อความมีแต่ช่องว่าง", { message: "   " }],
  ])("ไม่อ่าน: %s", (_, patch) => {
    expect(buildTtsText({ ...base, ...patch })).toBeNull();
  });

  it("ยอดเท่าขั้นต่ำพอดีก็อ่าน", () => {
    expect(buildTtsText({ ...base, amountSatang: 2000 })).toBe("สู้ๆ นะ");
  });

  it("จำกัดความยาว 300 ตัว", () => {
    expect(buildTtsText({ ...base, message: "ก ".repeat(400) })!.length).toBe(
      300,
    );
  });
});

describe("cleanForSpeech", () => {
  it.each([
    ["ไปดู https://evil.example/x?y=1 เลย", "ไปดู ลิงก์ เลย"],
    ["www.spam.com", "ลิงก์"],
    ["555555555555555", "55555"],
    ["เย้!!!!!!!!!!!", "เย้!!!!!"],
    ["บรรทัด1\nบรรทัด2\u0007", "บรรทัด1 บรรทัด2"],
  ])("%s → %s", (input, expected) => {
    expect(cleanForSpeech(input)).toBe(expected);
  });
});

it("speakAmount", () => {
  expect(speakAmount(100000)).toBe("1000 บาท");
  expect(speakAmount(100050)).toBe("1000 บาท 50 สตางค์");
});

describe("splitForSpeech", () => {
  it("ข้อความสั้นได้ท่อนเดียว", () => {
    expect(splitForSpeech("สู้ๆ นะ")).toEqual(["สู้ๆ นะ"]);
  });

  it("ตัดที่ช่องว่าง ทุกท่อนไม่เกินขีดจำกัด และต่อกลับได้ครบ", () => {
    const text = Array.from({ length: 40 }, (_, i) => `คำที่${i}`).join(" ");
    const chunks = splitForSpeech(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(50);
    expect(chunks.join(" ")).toBe(text);
  });

  it("ภาษาไทยไม่มีช่องว่าง ตัดกลางคำได้", () => {
    const chunks = splitForSpeech("ก".repeat(400), 180);
    expect(chunks.map((c) => c.length)).toEqual([180, 180, 40]);
  });
});

it("translateTtsUrls สร้าง URL ภาษาไทย encode ข้อความ", () => {
  const [url] = translateTtsUrls("สู้ๆ นะ & ok");
  const u = new URL(url);
  expect(u.origin + u.pathname).toBe(
    "https://translate.google.com/translate_tts",
  );
  expect(u.searchParams.get("tl")).toBe("th");
  expect(u.searchParams.get("q")).toBe("สู้ๆ นะ & ok");
});

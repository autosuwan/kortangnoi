/** F13 เสียงอ่านข้อความผู้บริจาค — logic ที่ใช้ร่วม client/server */

export const TTS_VOICES = [
  { id: "translate", label: "เสียง Google แปลภาษา (ฟรี)" },
  { id: "th-TH-Chirp3-HD-Kore", label: "HD ผู้หญิง (ต้องมี key)" },
  { id: "th-TH-Chirp3-HD-Charon", label: "HD ผู้ชาย (ต้องมี key)" },
  { id: "th-TH-Neural2-C", label: "ผู้หญิง Neural2 (ต้องมี key)" },
  { id: "th-TH-Standard-A", label: "ผู้หญิง มาตรฐาน (ต้องมี key)" },
] as const;

export type TtsVoice = (typeof TTS_VOICES)[number]["id"];
export type TtsMode = "message" | "full";

export const TTS_VOICE_IDS = TTS_VOICES.map((v) => v.id) as [
  TtsVoice,
  ...TtsVoice[],
];
export const TTS_TEXT_MAX = 300;
export const TTS_MIN_AMOUNT = { min: 100, max: 10_000_000 } as const;

/** อ่านยอดให้เป็นธรรมชาติ: 123450 → "1234 บาท 50 สตางค์" (ไม่ใส่ comma ให้ TTS อ่านเป็นตัวเลขเดียว) */
export function speakAmount(satang: number): string {
  const baht = Math.trunc(satang / 100);
  const st = satang % 100;
  return st ? `${baht} บาท ${st} สตางค์` : `${baht} บาท`;
}

/** ทำความสะอาดข้อความก่อนส่งให้ TTS อ่านออกอากาศ */
export function cleanForSpeech(input: string): string {
  return (
    input
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
      .replace(/(?:https?:\/\/|www\.)\S+/gi, "ลิงก์")
      // "55555555555" → "55555", "!!!!!!" → "!!!!!"
      .replace(/(.)\1{5,}/gu, "$1$1$1$1$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * ข้อความที่จะอ่าน หรือ null ถ้าไม่ต้องอ่าน
 * (ปิดไว้, ยอดต่ำกว่าขั้นต่ำ, โหมดอ่านเฉพาะข้อความแต่ไม่มีข้อความ)
 */
export function buildTtsText({
  enabled,
  mode,
  minAmountSatang,
  donorName,
  supportText,
  amountSatang,
  message,
}: {
  enabled: boolean;
  mode: TtsMode;
  minAmountSatang: number;
  donorName: string;
  supportText: string;
  amountSatang: number;
  message: string | null;
}): string | null {
  if (!enabled || amountSatang < minAmountSatang) return null;

  const msg = cleanForSpeech(message ?? "");
  const parts =
    mode === "full"
      ? [
          `${cleanForSpeech(donorName)} ${cleanForSpeech(supportText)} ${speakAmount(amountSatang)}`,
          msg,
        ]
      : [msg];
  const text = parts.filter(Boolean).join(" ").trim();
  return text ? text.slice(0, TTS_TEXT_MAX) : null;
}

/** ข้อความตัวอย่างของปุ่ม "ฟังตัวอย่าง" (ใช้ทั้ง client และ server) */
export function previewTtsText(mode: TtsMode, supportText: string): string {
  return buildTtsText({
    enabled: true,
    mode,
    minAmountSatang: 0,
    donorName: "ผู้ชมใจดี",
    supportText: supportText.trim() || "โดเนท",
    amountSatang: 10000,
    message: "สู้ๆ นะครับ ไลฟ์สนุกมาก",
  })!;
}

/** เสียงที่ต้องสร้างผ่าน Google Cloud TTS (server + key) — นอกนั้นคือ "translate" ที่เล่นจากเบราว์เซอร์ */
export type CloudTtsVoice = Exclude<TtsVoice, "translate">;
export const isCloudVoice = (voice: TtsVoice): voice is CloudTtsVoice =>
  voice !== "translate";

const TRANSLATE_CHUNK_MAX = 180;

/**
 * หั่นข้อความเป็นท่อนละ ≤ 180 ตัว (Google แปลภาษารับได้ราว 200 ตัวต่อครั้ง)
 * ตัดที่ช่องว่าง/เครื่องหมายก่อน ถ้าไม่มีค่อยตัดกลางคำ (ภาษาไทยไม่เว้นวรรคระหว่างคำ)
 */
export function splitForSpeech(
  text: string,
  max = TRANSLATE_CHUNK_MAX,
): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    const cut = Math.max(
      window.lastIndexOf(" "),
      window.lastIndexOf(","),
      window.lastIndexOf("."),
      window.lastIndexOf("!"),
      window.lastIndexOf("?"),
    );
    const at = cut > max / 2 ? cut + 1 : max;
    chunks.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * URL เสียงอ่านของ Google แปลภาษา (ไม่ใช่ API ทางการ — อาจพังได้ ดู spec F13)
 * เล่นจากเบราว์เซอร์ของสตรีมเมอร์โดยตรง
 */
export function translateTtsUrl(chunk: string, index = 0, total = 1): string {
  const params = new URLSearchParams({
    ie: "UTF-8",
    client: "tw-ob",
    tl: "th",
    q: chunk,
    idx: String(index),
    total: String(total),
    textlen: String(chunk.length),
  });
  return `https://translate.google.com/translate_tts?${params}`;
}

/** ลิสต์ URL ที่ต้องเล่นต่อกันสำหรับข้อความหนึ่ง */
export function translateTtsUrls(text: string): string[] {
  const chunks = splitForSpeech(text);
  return chunks.map((c, i) => translateTtsUrl(c, i, chunks.length));
}

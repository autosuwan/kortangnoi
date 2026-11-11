import { translateTtsUrls } from "@/lib/tts";

/** ข้อมูลเสียงอ่านของ alert: เสียง Google แปลภาษา (ข้อความ) หรือไฟล์จาก Cloud TTS (URL) */
export type Speech = { text?: string | null; url?: string | null };

function playOne(src: string, volume: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", () => reject(new Error("audio error")));
    audio.play().catch(reject);
  });
}

/**
 * เล่นเสียงอ่านจนจบ (ทีละท่อนสำหรับเสียงแปลภาษา) — resolve เมื่อจบ, reject ถ้าเล่นไม่ได้
 * เล่นในเบราว์เซอร์ของสตรีมเมอร์โดยตรง (overlay ใน OBS)
 */
export async function playSpeech(speech: Speech, volume: number) {
  const sources = speech.url
    ? [speech.url]
    : speech.text
      ? translateTtsUrls(speech.text)
      : [];
  for (const src of sources) await playOne(src, volume);
}

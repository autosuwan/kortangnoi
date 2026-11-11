import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CloudTtsVoice } from "@/lib/tts";

export type SpeechAudio = {
  bytes: Uint8Array;
  contentType: string;
  ext: string;
};

export class TtsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TtsUnavailableError";
  }
}

const ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const TIMEOUT_MS = 8000;

/**
 * แปลงข้อความเป็นเสียง (MP3) ด้วย Google Cloud Text-to-Speech
 * test/CI ตั้ง TTS_PROVIDER=fake → คืนไฟล์เสียงตัวอย่างในเครื่อง ไม่เรียก Google
 */
export async function synthesizeSpeech(
  text: string,
  voice: CloudTtsVoice,
): Promise<SpeechAudio> {
  if (process.env.TTS_PROVIDER === "fake") {
    if (text.includes("[tts-fail]"))
      throw new TtsUnavailableError("fake failure");
    const bytes = await readFile(
      path.join(process.cwd(), "public/sounds/alert.wav"),
    );
    return {
      bytes: new Uint8Array(bytes),
      contentType: "audio/wav",
      ext: "wav",
    };
  }

  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new TtsUnavailableError("GOOGLE_TTS_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "th-TH", name: voice },
        audioConfig: { audioEncoding: "MP3" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new TtsUnavailableError(`Google TTS request failed: ${error}`);
  }
  if (!res.ok) {
    // ไม่ log body ทั้งหมด — อาจมีข้อความผู้บริจาค
    throw new TtsUnavailableError(`Google TTS ${res.status}`);
  }
  const body = (await res.json()) as { audioContent?: string };
  if (!body.audioContent) throw new TtsUnavailableError("empty audio");
  return {
    bytes: new Uint8Array(Buffer.from(body.audioContent, "base64")),
    contentType: "audio/mpeg",
    ext: "mp3",
  };
}

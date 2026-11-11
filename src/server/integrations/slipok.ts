import "server-only";

import type { SlipData } from "@/lib/slip-check";
import { readSlipQr } from "@/server/slip-qr";

export type SlipOkResult =
  | { ok: true; data: SlipData }
  | { ok: false; code: number | null; message: string };

/** ส่งให้ SlipOK ตรวจด้วยข้อความใน QR (ที่เราอ่านเอง) หรือด้วยไฟล์รูป (ให้ SlipOK อ่าน QR เอง) */
export type SlipOkInput =
  | { data: string }
  | { file: { bytes: Uint8Array; mime: string; name: string } };

const TIMEOUT_MS = 8000;
export const FAKE_SLIP_PREFIX = "TESTSLIP|";

/**
 * ตรวจสลิปกับ SlipOK (key กลางจาก env)
 * ไม่ส่ง log / amount — เราเช็กสลิปซ้ำ ผู้รับ ยอด เองทั้งหมด (docs/spec.md F10)
 * test/CI ตั้ง SLIPOK_PROVIDER=fake: QR "TESTSLIP|<json>" กำหนดผลเองได้ ไม่เรียก SlipOK จริง
 */
export async function checkSlipWithSlipOk(
  input: SlipOkInput,
): Promise<SlipOkResult> {
  if (process.env.SLIPOK_PROVIDER === "fake") return fakeSlipOk(input);

  const key = process.env.SLIPOK_API_KEY;
  const branch = process.env.SLIPOK_BRANCH_ID;
  if (!key || !branch) {
    return {
      ok: false,
      code: 1002,
      message: "SLIPOK_API_KEY/SLIPOK_BRANCH_ID not set",
    };
  }

  let body: BodyInit;
  const headers: Record<string, string> = { "x-authorization": key };
  if ("data" in input) {
    headers["content-type"] = "application/json";
    body = JSON.stringify({ data: input.data });
  } else {
    const form = new FormData();
    form.append(
      "files",
      new Blob([new Uint8Array(input.file.bytes)], { type: input.file.mime }),
      input.file.name,
    );
    body = form; // fetch ตั้ง content-type multipart + boundary ให้เอง
  }

  let res: Response;
  try {
    res = await fetch(
      `https://api.slipok.com/api/line/apikey/${encodeURIComponent(branch)}`,
      {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch (error) {
    return {
      ok: false,
      code: null,
      message: `SlipOK request failed: ${error}`,
    };
  }

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: SlipData;
    code?: number;
    message?: string;
  } | null;

  if (res.ok && json?.success && json.data)
    return { ok: true, data: json.data };
  return {
    ok: false,
    code: typeof json?.code === "number" ? json.code : null,
    message: json?.message ?? `SlipOK HTTP ${res.status}`,
  };
}

async function fakeSlipOk(input: SlipOkInput): Promise<SlipOkResult> {
  const payload =
    "data" in input ? input.data : await readSlipQr(input.file.bytes);
  if (!payload) return { ok: false, code: 1007, message: "no QR (fake)" };
  if (!payload.startsWith(FAKE_SLIP_PREFIX)) {
    return { ok: false, code: 1008, message: "not a payment QR (fake)" };
  }
  const spec = JSON.parse(payload.slice(FAKE_SLIP_PREFIX.length)) as {
    code?: number;
    data?: SlipData;
    /** จำลองกรณี SlipOK ไม่รับ data (เช่น 1000) แต่อ่านจากไฟล์รูปได้ */
    failDataMode?: number;
  };
  if (spec.failDataMode && "data" in input) {
    return {
      ok: false,
      code: spec.failDataMode,
      message: "fake: data mode rejected",
    };
  }
  if (spec.code) return { ok: false, code: spec.code, message: "fake error" };
  return { ok: true, data: spec.data! };
}

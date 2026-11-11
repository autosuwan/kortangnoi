import "server-only";

import type { SlipData } from "@/lib/slip-check";

export type SlipOkResult =
  | { ok: true; data: SlipData }
  | { ok: false; code: number | null; message: string };

const TIMEOUT_MS = 8000;
export const FAKE_SLIP_PREFIX = "TESTSLIP|";

/**
 * ตรวจสลิปกับ SlipOK ด้วย QR payload (key กลางจาก env)
 * ไม่ส่ง log / amount — เราเช็กสลิปซ้ำ ผู้รับ ยอด เองทั้งหมด (docs/spec.md F10)
 * test/CI ตั้ง SLIPOK_PROVIDER=fake: payload "TESTSLIP|<json>" กำหนดผลเองได้ ไม่เรียก SlipOK จริง
 */
export async function checkSlipWithSlipOk(
  qrPayload: string,
): Promise<SlipOkResult> {
  if (process.env.SLIPOK_PROVIDER === "fake") return fakeSlipOk(qrPayload);

  const key = process.env.SLIPOK_API_KEY;
  const branch = process.env.SLIPOK_BRANCH_ID;
  if (!key || !branch) {
    return {
      ok: false,
      code: 1002,
      message: "SLIPOK_API_KEY/SLIPOK_BRANCH_ID not set",
    };
  }

  let res: Response;
  try {
    res = await fetch(
      `https://api.slipok.com/api/line/apikey/${encodeURIComponent(branch)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-authorization": key },
        body: JSON.stringify({ data: qrPayload }),
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

  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: SlipData & { success?: boolean };
    code?: number;
    message?: string;
  } | null;

  if (res.ok && body?.success && body.data)
    return { ok: true, data: body.data };
  return {
    ok: false,
    code: typeof body?.code === "number" ? body.code : null,
    message: body?.message ?? `SlipOK HTTP ${res.status}`,
  };
}

function fakeSlipOk(qrPayload: string): SlipOkResult {
  if (!qrPayload.startsWith(FAKE_SLIP_PREFIX)) {
    return { ok: false, code: 1008, message: "not a payment QR (fake)" };
  }
  const spec = JSON.parse(qrPayload.slice(FAKE_SLIP_PREFIX.length)) as
    { code: number } | { data: SlipData };
  if ("code" in spec)
    return { ok: false, code: spec.code, message: "fake error" };
  return { ok: true, data: spec.data };
}

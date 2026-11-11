import { randomUUID } from "node:crypto";

import QRCode from "qrcode";

import type { SlipData } from "@/lib/slip-check";

const PREFIX = "TESTSLIP|"; // ตรงกับ FAKE_SLIP_PREFIX ใน src/server/integrations/slipok.ts

/** QR payload ที่ fake SlipOK อ่านแล้วตอบ data ที่กำหนด */
export const fakeSlipPayload = (
  spec: { data: SlipData; failDataMode?: number } | { code: number },
) =>
  // nonce ทำให้ QR แต่ละใบไม่ซ้ำกัน (ไม่งั้นระบบจับว่าเป็นสลิปซ้ำ — ถูกต้องตามที่ควรเป็น)
  PREFIX + JSON.stringify({ ...spec, nonce: randomUUID() });

/** ข้อมูลสลิปที่ผ่านทุกข้อสำหรับสตรีมเมอร์ทดสอบ (เบอร์ 0812345678 ชื่อ สมชาย ใจดี) */
export function goodSlip(
  amountSatang: number,
  patch: Partial<SlipData> = {},
): SlipData {
  return {
    transRef: `T${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    transTimestamp: new Date(Date.now() - 60_000).toISOString(),
    amount: amountSatang / 100,
    receiver: {
      displayName: "นาย สมชาย ใ",
      name: "MR. SOMCHAI J",
      proxy: { type: "MSISDN", value: "xxx-xxx-5678" },
      account: { type: "BANKAC", value: "xxx-x-x1234-x" },
    },
    // ชื่อจริงผู้โอน — ต้องไม่หลุดไป overlay
    ...({
      sender: { displayName: "นาย ผู้โอน จริงจริง", name: "MR. REAL SENDER" },
    } as object),
    ...patch,
  };
}

/** รูปสลิปจำลอง: PNG มี QR อยู่ (+ ขอบขาว) */
export async function slipPng(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    width: 900,
    margin: 6,
    errorCorrectionLevel: "M",
  });
}

export async function slipFile(payload: string, name = "slip.png") {
  return new File([new Uint8Array(await slipPng(payload))], name, {
    type: "image/png",
  });
}

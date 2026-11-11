import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { AppError } from "@/lib/api-error";
import { MAX_SLIP_ATTEMPTS, type ReceiverSnapshot } from "@/lib/donation";
import { detectImageType } from "@/lib/image-type";
import {
  decideSlip,
  mapSlipOkError,
  SLIP_MESSAGES,
  type SlipData,
} from "@/lib/slip-check";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { checkSlipWithSlipOk } from "@/server/integrations/slipok";
import { readSlipQr } from "@/server/slip-qr";
import { sendDonationAlert } from "@/server/services/overlay";

type DonationStatus = Database["public"]["Enums"]["donation_status"];

export const SLIP_MAX_BYTES = 4 * 1024 * 1024;
/** แนบสลิปได้ถึง 24 ชม. หลังสร้าง (หลังหมดเวลา QR 30 นาทีจะไป pending_review) */
const ATTACH_WINDOW_MS = 24 * 60 * 60 * 1000;
const ALLOWED_TYPES = new Set(["jpg", "png", "webp"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PG_UNIQUE_VIOLATION = "23505";
/** SlipOK ไม่รับข้อความ QR ที่เราอ่านได้ → ลองส่งไฟล์รูปแทน */
const FALLBACK_TO_FILE = new Set([1000, 1006, 1007, 1008]);

export type SlipResult = {
  status: DonationStatus;
  resultMessage: string;
  attemptsLeft: number;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const notFound = () => new AppError(404, "NOT_FOUND", "ไม่พบรายการนี้");

function tokenMatches(token: string, hash: string) {
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** ข้อมูลจากสลิปที่เก็บไว้ให้เจ้าของดู (มีชื่อจริงผู้โอน — เห็นเฉพาะสตรีมเมอร์ ห้ามส่งไป overlay/webhook) */
function slipSummary(
  slip: SlipData & { sender?: unknown; sendingBank?: unknown },
) {
  return {
    transRef: slip.transRef,
    amount: slip.amount,
    transTimestamp: slip.transTimestamp ?? null,
    sendingBank: slip.sendingBank ?? null,
    sender: slip.sender ?? null,
    receiver: slip.receiver ?? null,
  };
}

async function logSystemError(code: string, message: string, context: Json) {
  await createAdminClient()
    .from("system_errors")
    .insert({
      source: "slipok",
      code,
      message: message.slice(0, 500),
      context,
    });
}

/** มีรายการอื่นที่ใช้สลิปนี้ไปแล้ว (approved / pending_review) ไหม */
async function usedElsewhere(
  column: "slip_qr_hash" | "trans_ref",
  value: string,
  donationId: string,
) {
  const { count, error } = await createAdminClient()
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .in("status", ["approved", "pending_review"])
    .neq("id", donationId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * F9/F10 ผู้บริจาคแนบสลิป → ตรวจ 12 ขั้นตาม docs/spec.md
 * เปลี่ยนสถานะด้วย conditional update เสมอ (กัน 2 แท็บส่งพร้อมกัน)
 */
export async function verifySlip(
  donationId: string,
  token: string,
  file: File,
): Promise<SlipResult> {
  if (!UUID.test(donationId)) throw notFound();
  const admin = createAdminClient();

  // ขั้น 1: รายการ + token + สถานะ + สิทธิ์แนบ
  const { data: donation, error } = await admin
    .from("donations")
    .select(
      "id, streamer_id, status, slip_attempts, access_token_hash, amount_satang, created_at, expires_at, receiver_snapshot",
    )
    .eq("id", donationId)
    .maybeSingle();
  if (error) throw error;
  if (!donation || !tokenMatches(token, donation.access_token_hash)) {
    throw notFound();
  }
  const attachable =
    donation.status === "awaiting_slip" ||
    (donation.status === "expired" &&
      Date.now() - Date.parse(donation.created_at) < ATTACH_WINDOW_MS);
  if (!attachable || donation.slip_attempts >= MAX_SLIP_ATTEMPTS) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      donation.status === "verifying"
        ? "กำลังตรวจสลิปอยู่ รอสักครู่"
        : "รายการนี้แนบสลิปไม่ได้แล้ว",
    );
  }

  // ขั้น 2: ไฟล์ (ไม่นับสิทธิ์)
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (
    bytes.length === 0 ||
    bytes.length > SLIP_MAX_BYTES ||
    !type ||
    !ALLOWED_TYPES.has(type.ext)
  ) {
    throw new AppError(
      400,
      "SLIP_FILE_INVALID",
      "รองรับเฉพาะรูป JPG, PNG หรือ WebP ไม่เกิน 4 MB",
    );
  }

  // ขั้น 3: จองสถานะ verifying (คำขอที่สองจะไม่ได้แถว)
  const { data: locked } = await admin
    .from("donations")
    .update({ status: "verifying" })
    .eq("id", donationId)
    .eq("status", donation.status)
    .eq("slip_attempts", donation.slip_attempts)
    .select("id")
    .maybeSingle();
  if (!locked) {
    throw new AppError(409, "INVALID_STATUS", "กำลังตรวจสลิปอยู่ รอสักครู่");
  }

  const attempt = donation.slip_attempts + 1;
  const attemptsLeft = MAX_SLIP_ATTEMPTS - attempt;
  const storagePath = `${donation.streamer_id}/${donationId}/${attempt}.${type.ext}`;
  await admin.storage
    .from("slips")
    .upload(storagePath, bytes, { contentType: type.mime, upsert: true });

  /** จบการตรวจ: อัปเดตแถว (conditional จาก verifying) แล้วคืนผล */
  async function finish(
    status: DonationStatus,
    resultMessage: string,
    extra: Partial<Database["public"]["Tables"]["donations"]["Update"]> = {},
  ): Promise<SlipResult> {
    const { error: updateError } = await admin
      .from("donations")
      .update({
        status,
        result_message: resultMessage,
        slip_attempts: attempt,
        slip_storage_path: storagePath,
        ...extra,
      })
      .eq("id", donationId)
      .eq("status", "verifying");
    if (updateError?.code === PG_UNIQUE_VIOLATION) {
      // อีกรายการใช้สลิปเดียวกันไปพร้อมกัน — unique index ตัดสิน
      return finish("rejected", SLIP_MESSAGES.duplicate, {
        verify_result: { step: "duplicate_race" },
      });
    }
    if (updateError) throw updateError;
    if (status === "approved") {
      await sendDonationAlert(donationId).catch((e) =>
        console.error("send donation alert failed", e),
      );
    }
    return {
      status,
      resultMessage,
      attemptsLeft: status === "awaiting_slip" ? attemptsLeft : 0,
    };
  }

  /** สลิปใช้ไม่ได้แต่ยังแนบใหม่ได้ (นับสิทธิ์) — หมดสิทธิ์แล้ว = rejected */
  function retry(message: string, verifyResult: Json) {
    if (attemptsLeft <= 0) {
      return finish(
        "rejected",
        `${message} (แนบครบ ${MAX_SLIP_ATTEMPTS} ครั้งแล้ว)`,
        {
          verify_result: verifyResult,
        },
      );
    }
    return finish("awaiting_slip", message, { verify_result: verifyResult });
  }

  // ขั้น 4: อ่าน QR เอง (ใช้กันสลิปซ้ำก่อนเสียโควตา)
  const qr = await readSlipQr(bytes);
  const qrInfo = qr ? { length: qr.length, prefix: qr.slice(0, 6) } : null;

  // ขั้น 5: hash ของ QR ซ้ำ (ไม่เสียโควตา SlipOK)
  const qrHash = qr ? sha256(qr) : null;
  if (qrHash && (await usedElsewhere("slip_qr_hash", qrHash, donationId))) {
    return finish("rejected", SLIP_MESSAGES.duplicate, {
      verify_result: { step: "duplicate_qr" },
    });
  }

  // ขั้น 6: SlipOK — ส่งข้อความ QR ก่อน; ถ้าเราอ่าน QR ไม่ได้ หรือ SlipOK ไม่รับข้อความนั้น
  // ส่งไฟล์รูปให้ SlipOK อ่าน QR เองแทน (สลิปบางแอปอ่านด้วยวิธีเราไม่ผ่าน)
  const fileInput = {
    file: { bytes, mime: type.mime, name: `slip.${type.ext}` },
  };
  let mode: "data" | "file" = qr ? "data" : "file";
  let slipok = await checkSlipWithSlipOk(qr ? { data: qr } : fileInput);
  if (!slipok.ok && qr && FALLBACK_TO_FILE.has(slipok.code ?? -1)) {
    console.warn(
      "slipok rejected QR data, retry with file",
      slipok.code,
      qrInfo,
    );
    mode = "file";
    slipok = await checkSlipWithSlipOk(fileInput);
  }
  if (!slipok.ok) {
    const action = mapSlipOkError(slipok.code);
    const verifyResult = {
      step: "slipok",
      slipokCode: slipok.code,
      slipokMessage: slipok.message.slice(0, 200),
      mode,
      qr: qrInfo,
    };
    if (action.kind === "retry") return retry(action.message, verifyResult);
    if (action.kind === "pending_review" && action.adminError) {
      await logSystemError(String(slipok.code ?? "network"), slipok.message, {
        donationId,
        mode,
        qr: qrInfo,
      }).catch((e) => console.error("log system error failed", e));
    }
    return finish(action.kind, action.message, {
      verify_result: verifyResult,
      slip_qr_hash: qrHash,
    });
  }
  const slip = slipok.data;

  // ขั้น 7: transRef ซ้ำ
  if (await usedElsewhere("trans_ref", slip.transRef, donationId)) {
    return finish("rejected", SLIP_MESSAGES.duplicate, {
      verify_result: {
        step: "duplicate_trans_ref",
        slip: slipSummary(slip),
      } as unknown as Json,
    });
  }

  // ขั้น 8–11: ผู้รับ ยอด เวลา แนบหลังหมดเวลา
  const decision = decideSlip({
    amountSatang: donation.amount_satang,
    createdAt: new Date(donation.created_at),
    expiresAt: new Date(donation.expires_at),
    receiver: donation.receiver_snapshot as unknown as ReceiverSnapshot,
    slip,
    now: new Date(),
  });

  // ขั้น 12
  return finish(decision.outcome, decision.message, {
    slip_qr_hash: qrHash,
    trans_ref: slip.transRef,
    trans_at: decision.checks.transferredAt,
    approved_via: decision.outcome === "approved" ? "auto" : null,
    verify_result: {
      step: "decided",
      mode,
      checks: decision.checks,
      slip: slipSummary(slip),
    } as unknown as Json,
  });
}

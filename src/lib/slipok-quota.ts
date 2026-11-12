/** โควตา SlipOK (F12) */
export type SlipOkQuota = {
  quota: number;
  overQuota: number;
  specialQuota: number;
  endDate: string | null;
  specialEndDate: string | null;
};

export const FREE_MONTHLY_QUOTA = 100;
const LOW_THRESHOLD = 20;

/** แปลง response ของ SlipOK (data) — รับเฉพาะตัวเลข/สตริงที่คาดไว้ */
export function parseQuota(data: unknown): SlipOkQuota | null {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d.quota !== "number") return null;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    quota: d.quota,
    overQuota: num(d.overQuota),
    specialQuota: num(d.specialQuota),
    endDate: str(d.endDate),
    specialEndDate: str(d.specialEndDate),
  };
}

/** สถานะเตือนของโควตา: เหลือน้อย (< 20) / หมด (0 หรือใช้เกินแล้ว) */
export function quotaLevel(q: SlipOkQuota): "ok" | "low" | "empty" {
  const remaining = q.quota + q.specialQuota;
  if (remaining <= 0 || q.overQuota > 0) return "empty";
  return remaining < LOW_THRESHOLD ? "low" : "ok";
}

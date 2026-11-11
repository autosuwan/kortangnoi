/** ประเทศไทยไม่มีเวลาออมแสง: UTC+7 ตลอดปี */
const OFFSET_MS = 7 * 60 * 60 * 1000;

/** จุดเริ่มวันนี้และเดือนนี้ตามเวลาไทย (คืนเป็นเวลา UTC สำหรับ query) */
export function bangkokPeriodStarts(now: Date = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  return {
    dayStart: new Date(Date.UTC(y, m, d) - OFFSET_MS),
    monthStart: new Date(Date.UTC(y, m, 1) - OFFSET_MS),
  };
}

/** แสดงเวลาแบบไทย เช่น "12 พ.ย. 05:04" */
export function formatBangkokDateTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

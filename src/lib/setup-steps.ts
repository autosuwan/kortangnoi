/** ตั้งค่าครั้งแรกแบบทีละขั้น (`?setup=1`) */
export const SETUP_STEPS = [
  { title: "ช่องทางรับเงิน", href: "/dashboard/payment?setup=1" },
  { title: "หน้าตา alert", href: "/dashboard/alert?setup=1" },
  { title: "เชื่อม OBS", href: "/dashboard/setup/obs" },
] as const;

export type SetupStep = 1 | 2 | 3;

/** ขั้นไหนทำเสร็จแล้ว [ช่องทางรับเงิน, alert, OBS] */
export type SetupProgress = {
  done: [boolean, boolean, boolean];
  /** กดเสร็จแล้ว/ซ่อนการ์ดเริ่มต้นใช้งาน */
  finished: boolean;
};

/** ขั้นแรกที่ยังไม่เสร็จ (เสร็จหมดแล้ว → ขั้นสุดท้าย) */
export function nextSetupStep(done: SetupProgress["done"]): SetupStep {
  const i = done.findIndex((d) => !d);
  return (i === -1 ? SETUP_STEPS.length : i + 1) as SetupStep;
}

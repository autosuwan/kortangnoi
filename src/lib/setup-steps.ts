/** ตั้งค่าครั้งแรกแบบทีละขั้น (`?setup=1`) */
export const SETUP_STEPS = [
  { title: "ช่องทางรับเงิน", href: "/dashboard/payment?setup=1" },
  { title: "หน้าตา alert", href: "/dashboard/alert?setup=1" },
  { title: "เชื่อม OBS", href: "/dashboard/setup/obs" },
] as const;

export type SetupStep = 1 | 2 | 3;

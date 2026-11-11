/** event ภายในหน้า dashboard — DonationWatcher ประกาศเมื่อรายการโดเนทเปลี่ยน (realtime) */
export const DONATIONS_CHANGED_EVENT = "kortangnoi:donations-changed";
export const PENDING_COUNT_EVENT = "kortangnoi:pending-count";

export type PendingCountDetail = { count: number };

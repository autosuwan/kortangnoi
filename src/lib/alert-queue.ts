import type { OverlayAlert } from "@/lib/overlay";

/**
 * คิว alert ของ overlay: แสดงทีละอัน, กันซ้ำด้วย donationId
 * (event เดียวกันอาจมาสองทาง เช่น broadcast + ดึง pending ตอน reconnect ใน F8)
 */
export type AlertQueue = { items: OverlayAlert[]; seen: string[] };

const SEEN_LIMIT = 200;

export const emptyQueue = (): AlertQueue => ({ items: [], seen: [] });

export function enqueue(queue: AlertQueue, alert: OverlayAlert): AlertQueue {
  if (queue.seen.includes(alert.donationId)) return queue;
  return {
    items: [...queue.items, alert],
    seen: [...queue.seen, alert.donationId].slice(-SEEN_LIMIT),
  };
}

export function dequeue(queue: AlertQueue): [OverlayAlert | null, AlertQueue] {
  const [first, ...rest] = queue.items;
  return [first ?? null, { ...queue, items: rest }];
}

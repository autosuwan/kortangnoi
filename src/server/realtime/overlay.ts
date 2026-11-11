import "server-only";

import { createHash } from "node:crypto";

import { OVERLAY_EVENTS } from "@/lib/overlay";
import { createAdminClient } from "@/lib/supabase/admin";

/** ชื่อ private channel ของ overlay — hash ของ token (ไม่ใส่ token ตรงๆ) */
export function overlayChannelName(token: string): string {
  return `overlay:${createHash("sha256").update(token).digest("hex").slice(0, 32)}`;
}

/** ส่ง event ไป overlay ผ่าน Realtime Broadcast (secret key — anon ส่งเองไม่ได้ ดู migration overlay_realtime) */
export async function broadcastToOverlay(
  token: string,
  event: (typeof OVERLAY_EVENTS)[keyof typeof OVERLAY_EVENTS],
  payload: Record<string, unknown>,
) {
  const client = createAdminClient();
  const channel = client.channel(overlayChannelName(token), {
    config: { private: true },
  });
  // httpSend ส่งผ่าน REST ไม่ต้องเปิด websocket
  const res = await channel.httpSend(event, payload);
  await client.removeChannel(channel);
  if (!res.success) {
    throw new Error(`overlay broadcast failed: ${JSON.stringify(res)}`);
  }
}

export async function getOverlayToken(userId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("overlay_token")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.overlay_token ?? null;
}

/** แจ้ง overlay ให้โหลดค่า alert ใหม่ — best effort ไม่ให้การบันทึกล้มเพราะ realtime */
export async function notifyOverlaySettingsChanged(userId: string) {
  try {
    const token = await getOverlayToken(userId);
    if (token) await broadcastToOverlay(token, OVERLAY_EVENTS.settings, {});
  } catch (error) {
    console.error("notify overlay settings failed", error);
  }
}

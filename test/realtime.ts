import { anonClient } from "./supabase";

/** subscribe channel ของ overlay แบบเดียวกับหน้า overlay (anon + private) แล้วเก็บ event ที่ได้รับ */
export async function subscribeAsOverlay(topic: string, events: string[]) {
  const client = anonClient();
  await client.realtime.setAuth();
  const received: { event: string; payload: unknown }[] = [];
  let channel = client.channel(topic, { config: { private: true } });
  for (const event of events) {
    channel = channel.on("broadcast", { event }, ({ payload }) => {
      received.push({ event, payload });
    });
  }
  const status = await new Promise<string>((resolve) =>
    channel.subscribe((s) => {
      if (s !== "CLOSED") resolve(s);
    }),
  );
  return {
    status,
    received,
    close: () => client.removeChannel(channel),
  };
}

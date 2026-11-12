"use client";

import { useCallback, useEffect, useState } from "react";

import {
  GoalWidget,
  QrWidget,
  RecentWidget,
  TopWidget,
  WidgetStage,
} from "@/components/overlay-widgets/widgets";
import {
  OVERLAY_EVENTS,
  type OverlayAlert,
  type OverlayConfig,
} from "@/lib/overlay";
import type { WidgetData, WidgetKind } from "@/lib/overlay-widgets";
import { createClient } from "@/lib/supabase/client";

/** ดึงซ้ำกันพลาดตอน realtime หลุด */
const POLL_MS = 60_000;

/**
 * widget บน OBS: ดึงข้อมูลจาก API แล้วดึงใหม่เมื่อมีโดเนทผ่าน/เปลี่ยนค่า
 * ใช้ private channel เดียวกับ alert (รับอย่างเดียว)
 */
export function WidgetOverlay({
  token,
  kind,
}: {
  token: string;
  kind: WidgetKind;
}) {
  const [data, setData] = useState<WidgetData[WidgetKind] | null>(null);
  const [invalid, setInvalid] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/overlay/${token}/widgets/${kind}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      setInvalid(true);
      return;
    }
    if (res.ok) setData(await res.json());
  }, [token, kind]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await load().catch(console.error);
      const res = await fetch(`/api/overlay/${token}`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const config: OverlayConfig = await res.json();

      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(config.channel, { config: { private: true } })
        .on("broadcast", { event: OVERLAY_EVENTS.donation }, ({ payload }) => {
          // alert ทดสอบไม่นับยอด
          if (!(payload as OverlayAlert).isTest) load().catch(console.error);
        })
        .on("broadcast", { event: OVERLAY_EVENTS.settings }, () => {
          load().catch(console.error);
        })
        .on("broadcast", { event: OVERLAY_EVENTS.revoked }, () => {
          setInvalid(true);
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") console.error("widget channel", err);
          // reconnect แล้วดึงใหม่ เผื่อพลาดระหว่างหลุด
          if (status === "SUBSCRIBED") load().catch(console.error);
        });
    })();

    const timer = setInterval(() => load().catch(console.error), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [token, load]);

  if (invalid) {
    return (
      <p
        role="alert"
        className="m-3 w-fit rounded-md bg-black/70 px-2 py-1 text-xs text-white"
      >
        ลิงก์ overlay ไม่ถูกต้อง — คัดลอกลิงก์ใหม่จาก dashboard
      </p>
    );
  }

  return (
    <main data-testid="widget-overlay" data-ready={data ? "true" : "false"}>
      <WidgetStage kind={kind} className="min-h-dvh">
        {data && kind === "goal" && (
          <GoalWidget data={data as WidgetData["goal"]} />
        )}
        {data && kind === "qr" && <QrWidget data={data as WidgetData["qr"]} />}
        {data && kind === "top" && (
          <TopWidget data={data as WidgetData["top"]} />
        )}
        {data && kind === "recent" && (
          <RecentWidget data={data as WidgetData["recent"]} />
        )}
      </WidgetStage>
    </main>
  );
}

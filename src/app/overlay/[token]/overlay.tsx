"use client";

import { Volume2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { AlertCard } from "@/components/alert-card";
import {
  dequeue,
  emptyQueue,
  enqueue,
  type AlertQueue,
} from "@/lib/alert-queue";
import { ALERT_SOUND, alertImageUrl } from "@/lib/alert-settings";
import {
  OVERLAY_EVENTS,
  type OverlayAlert,
  type OverlayConfig,
  type OverlaySettings,
} from "@/lib/overlay";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ANIMATION_MS = 500;
const noopSubscribe = () => () => {};
const GAP_MS = 700;

type Phase = "in" | "out";

declare global {
  interface Window {
    /** มีเฉพาะใน OBS Browser Source */
    obsstudio?: unknown;
  }
}

/**
 * หน้า overlay ใน OBS: รับ alert ผ่าน Realtime (private channel, รับอย่างเดียว)
 * แล้วแสดงทีละอันตามคิว + เล่นเสียง
 */
export function Overlay({ token }: { token: string }) {
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [current, setCurrent] = useState<OverlayAlert | null>(null);
  const [phase, setPhase] = useState<Phase>("in");
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  // ในเบราว์เซอร์ทั่วไปต้องคลิกก่อนถึงเล่นเสียงได้ — ใน OBS เล่นได้เลย
  const inObs = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(window.obsstudio),
    () => true,
  );
  const needsSoundUnlock = (!inObs && !soundUnlocked) || soundBlocked;
  const queue = useRef<AlertQueue>(emptyQueue());
  const playing = useRef(false);
  const settingsRef = useRef<OverlaySettings | null>(null);

  const loadConfig = useCallback(async (): Promise<OverlayConfig | null> => {
    const res = await fetch(`/api/overlay/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      setInvalid(true);
      return null;
    }
    if (!res.ok) throw new Error(`overlay config ${res.status}`);
    const config: OverlayConfig = await res.json();
    settingsRef.current = config.settings;
    setSettings(config.settings);
    // preload รูปไว้ก่อน alert จะได้ไม่ขึ้นก่อนรูปมา
    new Image().src = alertImageUrl(config.settings);
    return config;
  }, [token]);

  const playNext = useCallback(function play() {
    if (playing.current) return;
    const [next, rest] = dequeue(queue.current);
    queue.current = rest;
    if (!next) return;

    playing.current = true;
    setCurrent(next);
    setPhase("in");

    const s = settingsRef.current;
    if (s?.soundEnabled) {
      const audio = new Audio(ALERT_SOUND);
      audio.volume = s.volume / 100;
      audio.play().catch(() => setSoundBlocked(true));
    }

    const duration = (s?.durationSec ?? 8) * 1000;
    setTimeout(() => setPhase("out"), duration);
    setTimeout(() => {
      setCurrent(null);
      playing.current = false;
      setTimeout(play, GAP_MS);
    }, duration + ANIMATION_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const config = await loadConfig().catch((e) => {
        console.error(e);
        return null;
      });
      if (!config || cancelled) return;

      await supabase.realtime.setAuth();
      channel = supabase
        .channel(config.channel, { config: { private: true } })
        .on("broadcast", { event: OVERLAY_EVENTS.donation }, ({ payload }) => {
          queue.current = enqueue(queue.current, payload as OverlayAlert);
          playNext();
        })
        .on("broadcast", { event: OVERLAY_EVENTS.settings }, () => {
          loadConfig().catch(console.error);
        })
        .on("broadcast", { event: OVERLAY_EVENTS.revoked }, () => {
          setInvalid(true);
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") console.error("overlay channel", err);
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadConfig, playNext]);

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
    <main
      data-testid="overlay"
      data-ready={settings ? "true" : "false"}
      className="flex min-h-dvh items-center justify-center p-6"
    >
      {current && settings && (
        <AlertCard
          key={current.donationId}
          imageUrl={current.imageUrl}
          donorName={current.donorName}
          supportText={current.supportText}
          amountSatang={current.amountSatang}
          message={current.message}
          nameColor={current.nameColor}
          className={cn(
            phase === "in" && "animate-in duration-500 fade-in-0 zoom-in-90",
            phase === "out" &&
              "animate-out duration-500 fade-out-0 fill-mode-forwards zoom-out-90",
          )}
        />
      )}

      {needsSoundUnlock && (
        <button
          type="button"
          onClick={() => {
            new Audio(ALERT_SOUND).play().catch(() => {});
            setSoundUnlocked(true);
            setSoundBlocked(false);
          }}
          className="fixed top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs text-white"
        >
          <Volume2 className="size-3.5" aria-hidden />
          คลิกเพื่อเปิดเสียง (ใน OBS ไม่ต้องกด)
        </button>
      )}
    </main>
  );
}

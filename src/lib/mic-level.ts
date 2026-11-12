"use client";

import { useEffect, useRef, useState } from "react";

import { AVATAR_HOLD_MS, isSpeakingLevel, rmsToLevel } from "./overlay-widgets";

export type MicStatus = "off" | "starting" | "on" | "error";

/**
 * ระดับเสียงไมค์ 0–100 ทุกเฟรม — วิเคราะห์ในเบราว์เซอร์เท่านั้น เสียงไม่ถูกส่งไปไหน
 * ปิด echo cancel/noise suppression/auto gain ให้ระดับตรงกับเสียงจริง
 */
export function useMicLevel(enabled: boolean) {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<MicStatus>("off");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- สถานะการขอไมค์
    setStatus("starting");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled) return;
        ctx = new AudioContext();
        // ไม่รอ: บางเบราว์เซอร์ resume ค้างจนกว่าจะคลิก (OBS เล่นเสียงได้เอง)
        void ctx.resume().catch(() => {});
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        let last = -1;
        const tick = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += v * v;
          const next = rmsToLevel(Math.sqrt(sum / buf.length));
          if (next !== last) {
            last = next;
            setLevel(next);
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
        setStatus("on");
      } catch (e) {
        console.error("mic unavailable", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      setLevel(0);
      setStatus("off");
    };
  }, [enabled]);

  return { level, status };
}

/** พูดอยู่ไหม: ถึงเกณฑ์ = พูดทันที, ต่ำกว่าเกณฑ์ค้างไว้อีก AVATAR_HOLD_MS กันกระพริบ */
export function useSpeaking(level: number, threshold: number): boolean {
  const above = isSpeakingLevel(level, threshold);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (above) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- เริ่มพูดทันที
      setSpeaking(true);
    } else if (!timer.current) {
      timer.current = setTimeout(() => {
        timer.current = null;
        setSpeaking(false);
      }, AVATAR_HOLD_MS);
    }
  }, [above]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return speaking;
}

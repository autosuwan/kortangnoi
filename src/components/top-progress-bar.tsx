"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NAVIGATION_START_EVENT } from "@/lib/navigation-progress";

const TRICKLE_MS = 200;
const SAFETY_TIMEOUT_MS = 15_000;

/** คลิกลิงก์ภายในเว็บที่พาไปหน้าอื่น (ไม่ใช่แท็บใหม่/ดาวน์โหลด/anchor ในหน้าเดิม) */
function isInternalNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false;
  const anchor = (event.target as Element | null)?.closest?.("a");
  if (
    !anchor ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return false;
  }
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return false;
  return url.pathname + url.search !== location.pathname + location.search;
}

/**
 * เส้นสีส้มขอบบนจอ: ค้างเต็มความกว้างตลอดเวลา
 * พอเปลี่ยนหน้าจะเริ่มใหม่จากซ้ายแล้ววิ่งไปขวา จนหน้าใหม่โหลดเสร็จก็เต็มอีกครั้ง
 * ไม่แสดงใน overlay (ติดจอไลฟ์ใน OBS)
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(1);
  const [loading, setLoading] = useState(false);
  const timers = useRef<{ trickle?: number; safety?: number }>({});

  // หน้าใหม่ commit แล้ว → เต็ม
  useEffect(() => {
    clearInterval(timers.current.trickle);
    clearTimeout(timers.current.safety);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync กับการเปลี่ยน URL
    setLoading(false);
    setProgress(1);
  }, [pathname, searchParams]);

  useEffect(() => {
    function start() {
      clearInterval(timers.current.trickle);
      clearTimeout(timers.current.safety);
      setLoading(true);
      setProgress(0.08);
      // ค่อยๆ ขยับเข้าใกล้ 90% ระหว่างรอ
      timers.current.trickle = window.setInterval(() => {
        setProgress((p) => p + (0.9 - p) * 0.12);
      }, TRICKLE_MS);
      // กันค้าง (เช่น ลิงก์ที่ไม่ได้เปลี่ยน URL จริง)
      timers.current.safety = window.setTimeout(() => {
        clearInterval(timers.current.trickle);
        setLoading(false);
        setProgress(1);
      }, SAFETY_TIMEOUT_MS);
    }
    const onClick = (e: MouseEvent) => {
      if (isInternalNavigation(e)) start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATION_START_EVENT, start);
    const t = timers.current;
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATION_START_EVENT, start);
      clearInterval(t.trickle);
      clearTimeout(t.safety);
    };
  }, []);

  if (pathname.startsWith("/overlay")) return null;

  return (
    <div
      aria-hidden
      data-testid="top-progress"
      data-loading={loading ? "true" : "false"}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full origin-left bg-primary shadow-[0_0_8px_var(--color-primary)] transition-transform duration-200 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicEnv } from "@/lib/env";
import {
  fetchGifs,
  GIF_QUERY_MAX,
  klipyCustomerId,
  type GifItem,
} from "@/lib/klipy";
import { cn } from "@/lib/utils";

const UNAVAILABLE = "ค้นหา GIF ไม่ได้ตอนนี้ ลองอัปโหลดเองแทน";

/**
 * ค้นหา GIF จาก KLIPY (เรียกจากเบราว์เซอร์ตามข้อกำหนด KLIPY)
 * ต้องมี placeholder "Search KLIPY" และ "Powered by KLIPY" ตาม attribution guideline
 * แสดงผลตามลำดับที่ KLIPY ส่งมา ห้ามเรียง/กรองเอง
 */
export function GifPicker({
  userId,
  selectedUrl,
  disabled,
  onSelect,
}: {
  userId: string;
  selectedUrl: string | null;
  disabled: boolean;
  onSelect: (gif: GifItem) => void;
}) {
  const appKey = publicEnv.klipyAppKey;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GifItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customerId = useRef<Promise<string> | null>(null);

  async function load(q: string, page: number, signal?: AbortSignal) {
    customerId.current ??= klipyCustomerId(userId);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGifs({
        appKey,
        query: q,
        page,
        customerId: await customerId.current,
        signal,
      });
      setItems((prev) =>
        page === 1 ? result.items : [...prev, ...result.items],
      );
      setNextPage(result.nextPage);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      console.error(e);
      setError(UNAVAILABLE);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  // พิมพ์แล้วรอ 400ms ค่อยค้นหา (ช่องว่าง = trending) ประหยัดโควตา KLIPY
  useEffect(() => {
    if (!appKey) return;
    const controller = new AbortController();
    const timer = setTimeout(() => load(query, 1, controller.signal), 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load อ่าน state ล่าสุดอยู่แล้ว
  }, [query, appKey]);

  if (!appKey) {
    return <p className="text-sm text-muted-foreground">{UNAVAILABLE}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="ค้นหา GIF"
          placeholder="Search KLIPY"
          maxLength={GIF_QUERY_MAX}
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div
        role="group"
        aria-label="ผลการค้นหา GIF"
        aria-busy={loading}
        className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4"
      >
        {items.map((gif) => (
          <button
            key={gif.id}
            type="button"
            disabled={disabled}
            aria-label={gif.title || "GIF"}
            aria-pressed={selectedUrl === gif.url}
            onClick={() => onSelect(gif)}
            className={cn(
              "aspect-square overflow-hidden rounded-lg border bg-muted transition-shadow hover:ring-2 hover:ring-primary/40 disabled:opacity-60",
              selectedUrl === gif.url && "ring-2 ring-primary",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ต้องโหลดจาก URL ของ KLIPY ตรงๆ */}
            <img
              src={gif.previewUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          </button>
        ))}
        {loading &&
          Array.from({ length: items.length ? 4 : 12 }, (_, i) => (
            <div
              key={`s${i}`}
              className="aspect-square animate-pulse rounded-lg bg-muted"
            />
          ))}
      </div>

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground">ไม่พบ GIF ลองคำอื่น</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Powered by KLIPY</span>
        {nextPage && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => load(query, nextPage)}
          >
            {loading && <Loader2 className="animate-spin" />}
            โหลดเพิ่ม
          </Button>
        )}
      </div>
    </div>
  );
}

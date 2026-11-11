/**
 * ค้นหา GIF จาก KLIPY — เรียกจากเบราว์เซอร์โดยตรงตาม Integration Requirements ของ KLIPY
 * (ห้าม proxy ผ่าน server, ใช้ URL ตามที่ได้มา, ห้ามเรียงลำดับ/กรองผลลัพธ์เอง)
 * https://docs.klipy.com/integration-requirements
 */

const API_BASE = "https://api.klipy.com/api/v1";
export const KLIPY_MEDIA_HOSTS = [
  "static.klipy.com",
  "static1.klipy.com",
  "static2.klipy.com",
] as const;
export const GIF_QUERY_MAX = 50;

export type GifItem = {
  id: string;
  title: string;
  /** ภาพย่อใน grid (ขนาด sm) */
  previewUrl: string;
  /** ใช้เป็นรูป alert (ขนาด md) */
  url: string;
  width: number;
  height: number;
};

export type GifPage = { items: GifItem[]; nextPage: number | null };

type KlipyFile = { url?: string; width?: number; height?: number };
type KlipySize = Partial<Record<"gif" | "webp" | "mp4" | "jpg", KlipyFile>>;
type KlipyItem = {
  id?: number | string;
  slug?: string;
  title?: string;
  type?: string;
  file?: Partial<Record<"hd" | "md" | "sm" | "xs", KlipySize>>;
};
type KlipyResponse = {
  result?: boolean;
  data?: { data?: KlipyItem[]; current_page?: number; has_next?: boolean };
};

export function isKlipyMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (KLIPY_MEDIA_HOSTS as readonly string[]).includes(url.hostname)
    );
  } catch {
    return false;
  }
}

const pickImage = (size: KlipySize | undefined) =>
  size?.gif?.url ? size.gif : size?.webp?.url ? size.webp : undefined;

/** แปลง response ของ KLIPY เป็นรายการที่ใช้ได้ — คงลำดับเดิม ข้ามเฉพาะรายการที่ไม่มีไฟล์รูป (เช่น โฆษณา) */
export function parseGifResponse(body: KlipyResponse): GifPage {
  const data = body.data;
  const items: GifItem[] = [];
  for (const item of data?.data ?? []) {
    const main =
      pickImage(item.file?.md) ??
      pickImage(item.file?.sm) ??
      pickImage(item.file?.hd);
    const preview = pickImage(item.file?.sm) ?? main;
    if (!main?.url || !preview?.url || !isKlipyMediaUrl(main.url)) continue;
    items.push({
      id: String(item.slug ?? item.id),
      title: item.title ?? "",
      previewUrl: preview.url,
      url: main.url,
      width: main.width ?? 0,
      height: main.height ?? 0,
    });
  }
  const page = data?.current_page ?? 1;
  return { items, nextPage: data?.has_next ? page + 1 : null };
}

export async function fetchGifs({
  appKey,
  query,
  page,
  customerId,
  signal,
}: {
  appKey: string;
  query: string;
  page: number;
  customerId: string;
  signal?: AbortSignal;
}): Promise<GifPage> {
  const q = query.trim().slice(0, GIF_QUERY_MAX);
  const params = new URLSearchParams({
    page: String(page),
    per_page: "24",
    customer_id: customerId,
    locale: "th",
    content_filter: "medium",
  });
  if (q) params.set("q", q);
  const endpoint = q ? "search" : "trending";

  const res = await fetch(
    `${API_BASE}/${encodeURIComponent(appKey)}/gifs/${endpoint}?${params}`,
    { signal },
  );
  if (!res.ok) throw new Error(`KLIPY ${res.status}`);
  return parseGifResponse(await res.json());
}

/** customer_id ต้องคงที่ต่อผู้ใช้ — ส่ง hash ของ user id แทน id จริง */
export async function klipyCustomerId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`kortangnoi:${userId}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

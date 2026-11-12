-- F14: หน้าตา overlay (สี/ขนาด) ต่อ widget — validate + เติมค่าเริ่มต้นที่ API (resolveStyles)
-- เพิ่มคอลัมน์อย่างเดียว โค้ดเวอร์ชันก่อนหน้าไม่อ่านคอลัมน์นี้จึงไม่พัง
alter table public.overlay_widgets
  add column styles jsonb not null default '{}'::jsonb
    check (jsonb_typeof(styles) = 'object' and pg_column_size(styles) <= 8192);

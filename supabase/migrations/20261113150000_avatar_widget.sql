-- F14 Avatar พูดได้: รูปตอนเงียบ/ตอนพูด (ไฟล์อยู่ bucket alert-media, เขียนผ่าน server เท่านั้น)
-- เพิ่มคอลัมน์อย่างเดียว โค้ดเวอร์ชันก่อนหน้าไม่อ่านคอลัมน์เหล่านี้จึงไม่พัง
alter table public.overlay_widgets
  add column avatar_idle_url text,
  add column avatar_idle_path text,
  add column avatar_speak_url text,
  add column avatar_speak_path text,
  add constraint overlay_widgets_avatar_idle_pair
    check ((avatar_idle_url is null) = (avatar_idle_path is null)),
  add constraint overlay_widgets_avatar_speak_pair
    check ((avatar_speak_url is null) = (avatar_speak_path is null));

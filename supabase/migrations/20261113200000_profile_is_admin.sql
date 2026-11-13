-- F12 ให้สิทธิ์แอดมินจากหน้าเว็บ (เจ้าของระบบใน ADMIN_USER_IDS เป็นคนให้/ถอน)
-- เพิ่มอย่างเดียว; profiles ไม่มี policy update ให้ client → แก้ได้ผ่าน server เท่านั้น
alter table public.profiles
  add column is_admin boolean not null default false;

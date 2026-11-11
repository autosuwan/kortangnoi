-- F3: รูป/GIF ของ alert เก็บใน bucket public อ่านได้ทุกคน (OBS ต้องโหลดได้โดยไม่ล็อกอิน)
-- เขียน/ลบผ่าน API ของเรา (secret key) เท่านั้น จึงไม่สร้าง policy ให้ client เขียน
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alert-media',
  'alert-media',
  true,
  4 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- alert_settings แก้ผ่าน API เท่านั้น (validate + จัดการไฟล์ใน storage) เหมือน payment_settings
revoke update on public.alert_settings from authenticated;
drop policy if exists "owner can update alert settings" on public.alert_settings;

alter table public.alert_settings
  add constraint alert_settings_upload_has_file
    check (media_type <> 'upload' or (media_url is not null and media_storage_path is not null));

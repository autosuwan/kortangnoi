-- F3: เลือก GIF จาก KLIPY ต้องมี URL (ไฟล์อยู่ที่ KLIPY ไม่มี storage path)
alter table public.alert_settings
  add constraint alert_settings_gif_has_url
    check (media_type <> 'gif' or (media_url is not null and media_storage_path is null));

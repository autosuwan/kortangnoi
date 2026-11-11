-- alert แบบไม่มีการ์ด: "<ชื่อ> <คำสนับสนุน> <ยอด> บาท" — สตรีมเมอร์ตั้งคำสนับสนุนและสีชื่อผู้บริจาคเองได้
alter table public.alert_settings
  add column support_text text not null default 'โดเนท'
    constraint alert_settings_support_text_length
      check (char_length(btrim(support_text)) between 1 and 40),
  add column name_color text not null default '#FACC15'
    constraint alert_settings_name_color_hex
      check (name_color ~ '^#[0-9A-F]{6}$');

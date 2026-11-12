-- F2/F8: สตรีมเมอร์เปิดให้ผู้บริจาคไม่เปิดเผยชื่อได้ (ขึ้นเป็น "Anonymous")
alter table public.payment_settings
  add column allow_anonymous boolean not null default false;

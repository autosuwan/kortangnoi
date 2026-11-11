-- สตรีมเมอร์เลือกได้ว่าส่วนไหนของ alert ให้ผู้บริจาคเลือกเองในหน้าโดเนท (F8)
alter table public.alert_settings
  add column donor_can_pick_image boolean not null default false,
  add column donor_can_pick_color boolean not null default false,
  add column donor_can_pick_support_text boolean not null default false;

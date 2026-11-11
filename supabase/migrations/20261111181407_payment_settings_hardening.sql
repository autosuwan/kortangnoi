-- F2: เขียน payment_settings ผ่าน API ของเราเท่านั้น (validate ใน src/lib/payment-settings.ts)
-- เจ้าของยังอ่านแถวตัวเองได้ตาม RLS เดิม
revoke update on public.payment_settings from authenticated;
drop policy if exists "owner can update payment settings" on public.payment_settings;

-- constraint สำรอง เผื่อโค้ดฝั่ง server พลาด
alter table public.payment_settings
  add constraint payment_settings_promptpay_id_length
    check (length(promptpay_id) in (0, 10, 13)),
  add constraint payment_settings_account_name_th_length
    check (length(account_name_th) <= 100),
  add constraint payment_settings_account_name_en_format
    check (account_name_en is null or account_name_en ~ '^[A-Z .]{2,100}$'),
  add constraint payment_settings_enabled_complete
    check (not enabled or (promptpay_id <> '' and account_name_th <> ''));

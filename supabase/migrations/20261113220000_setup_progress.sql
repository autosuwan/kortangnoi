-- ตั้งค่าครั้งแรกทีละขั้น: ติ๊กถูกตามที่ทำจริง
-- alert_settings.customized_at = เคยบันทึก/เปลี่ยนรูป alert (updated_at ใช้ไม่ได้ เพราะปุ่มทดสอบ/ฟังเสียงก็แก้แถว)
-- profiles.setup_done_at = กด "เสร็จแล้ว" หรือซ่อนการ์ดเริ่มต้นใช้งาน
alter table public.alert_settings add column customized_at timestamptz;
alter table public.profiles add column setup_done_at timestamptz;

-- ผู้ใช้เดิมที่เปิดรับโดเนทแล้วไม่ต้องเห็นการ์ดเริ่มต้นใช้งานอีก
update public.profiles p
set setup_done_at = now()
from public.payment_settings ps
where ps.user_id = p.id and ps.enabled;

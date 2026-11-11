-- F4: overlay รับ alert ผ่าน Realtime Broadcast แบบ private channel
-- anon (OBS ไม่ได้ล็อกอิน) และ authenticated (สตรีมเมอร์เปิด overlay ในเบราว์เซอร์ที่ล็อกอินอยู่)
-- "รับ" ได้อย่างเดียว ไม่มี policy insert
-- → client ส่ง alert ปลอมไม่ได้ ส่งได้เฉพาะ server ที่ใช้ secret key
-- ชื่อ topic = overlay:<sha256(token) 32 ตัว> เดาไม่ได้ถ้าไม่มีลิงก์ overlay
create policy "overlay can receive broadcasts"
  on realtime.messages
  for select
  to anon, authenticated
  using (
    realtime.topic() like 'overlay:%'
    and realtime.messages.extension in ('broadcast')
  );

-- rate limit ปุ่มทดสอบ alert (serverless ไม่มี memory ร่วม ใช้ conditional update แทน)
alter table public.alert_settings add column last_test_at timestamptz;

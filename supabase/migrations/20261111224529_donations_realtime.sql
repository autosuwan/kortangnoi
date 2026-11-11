-- F5/F6: dashboard ฟังรายการโดเนทของตัวเองแบบ realtime (แจ้งเตือนรายการรอตรวจใหม่)
-- RLS "streamer can read own donations" กรองให้เห็นเฉพาะแถวของตัวเอง
alter publication supabase_realtime add table public.donations;

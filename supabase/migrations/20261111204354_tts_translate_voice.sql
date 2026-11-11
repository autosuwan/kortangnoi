-- F13: เพิ่มเสียง Google แปลภาษา ("translate") เป็นค่าเริ่มต้น — ฟรี ไม่ต้องผูกบัตร
-- overlay ดึงเสียงจาก translate.google.com เองจากเครื่องสตรีมเมอร์ (ไม่ผ่าน server)
alter table public.alert_settings drop constraint alert_settings_tts_voice;
alter table public.alert_settings
  add constraint alert_settings_tts_voice check (tts_voice in (
    'translate',
    'th-TH-Chirp3-HD-Kore',
    'th-TH-Chirp3-HD-Charon',
    'th-TH-Neural2-C',
    'th-TH-Standard-A'
  )),
  alter column tts_voice set default 'translate';

-- ยังไม่มีใครใช้เสียง Cloud ได้จริง (ไม่มี key) → ย้ายทุกคนไปเสียง translate
update public.alert_settings set tts_voice = 'translate' where tts_voice = 'th-TH-Chirp3-HD-Kore';

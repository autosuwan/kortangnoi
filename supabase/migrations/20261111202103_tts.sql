-- F13: อ่านข้อความผู้บริจาคออกเสียง (Google Cloud TTS) เล่นใน overlay
alter table public.alert_settings
  add column tts_enabled boolean not null default false,
  add column tts_mode text not null default 'message'
    constraint alert_settings_tts_mode check (tts_mode in ('message', 'full')),
  add column tts_min_amount_satang int not null default 2000
    constraint alert_settings_tts_min_amount check (tts_min_amount_satang between 100 and 10000000),
  add column tts_voice text not null default 'th-TH-Chirp3-HD-Kore'
    constraint alert_settings_tts_voice check (tts_voice in (
      'th-TH-Chirp3-HD-Kore',
      'th-TH-Chirp3-HD-Charon',
      'th-TH-Neural2-C',
      'th-TH-Standard-A'
    )),
  add column tts_volume smallint not null default 100
    constraint alert_settings_tts_volume check (tts_volume between 0 and 100),
  add column tts_preview_at timestamptz;

-- ไฟล์เสียงอ่าน: private, server เขียน/ลบเท่านั้น, overlay ได้ signed URL
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts-audio', 'tts-audio', false, 2 * 1024 * 1024, array['audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

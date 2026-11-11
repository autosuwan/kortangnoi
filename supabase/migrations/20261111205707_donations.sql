-- F8: รายการโดเนท (ใช้ต่อใน F9 แนบสลิป / F10 ตรวจสลิป / F5-F6 ประวัติ)
create type public.donation_status as enum (
  'awaiting_slip', 'verifying', 'approved', 'pending_review', 'rejected', 'expired'
);
create type public.approval_method as enum ('auto', 'manual');

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  streamer_id uuid not null references public.profiles (id) on delete cascade,
  donor_name text not null
    constraint donations_donor_name_length check (char_length(donor_name) between 1 and 30),
  message text
    constraint donations_message_length check (message is null or char_length(message) <= 150),
  amount_satang int not null
    constraint donations_amount check (amount_satang > 0 and amount_satang <= 10000000),
  status public.donation_status not null default 'awaiting_slip',
  -- เก็บ hash ของ token ที่ผู้บริจาคใช้เปิดรายการ ไม่เก็บ token ตรงๆ
  access_token_hash text not null,
  -- ข้อมูลผู้รับ ณ ตอนสร้าง (แก้เลข PromptPay ทีหลังก็ยังเช็กกับข้อมูลเดิม)
  receiver_snapshot jsonb not null,
  qr_payload text not null,
  expires_at timestamptz not null,
  -- หน้าตา alert ที่ผู้บริจาคเลือก (ผ่านการกรองตามสิทธิ์ที่สตรีมเมอร์เปิดแล้ว)
  donor_media_url text,
  donor_name_color text
    constraint donations_donor_name_color check (donor_name_color is null or donor_name_color ~ '^#[0-9A-F]{6}$'),
  donor_support_text text
    constraint donations_donor_support_text check (donor_support_text is null or char_length(donor_support_text) between 1 and 40),
  -- F9/F10
  slip_attempts smallint not null default 0
    constraint donations_slip_attempts check (slip_attempts between 0 and 3),
  slip_storage_path text,
  slip_qr_hash text,
  trans_ref text,
  trans_at timestamptz,
  verify_result jsonb,
  result_message text,
  approved_via public.approval_method,
  review_note text,
  reviewed_at timestamptz,
  alert_acked_at timestamptz,
  webhook_error text,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger donations_set_updated_at
  before update on public.donations
  for each row execute function public.set_updated_at();

-- กันสลิปซ้ำ: นับเฉพาะรายการที่ "ใช้สลิปไปแล้ว" (ดู docs/er.md)
create unique index donations_trans_ref_used
  on public.donations (trans_ref) where status in ('approved', 'pending_review');
create unique index donations_slip_qr_hash_used
  on public.donations (slip_qr_hash) where status in ('approved', 'pending_review');

create index donations_streamer_status_created
  on public.donations (streamer_id, status, created_at desc);
create index donations_streamer_approved_created
  on public.donations (streamer_id, created_at) where status = 'approved';
create index donations_streamer_unacked
  on public.donations (streamer_id, created_at) where status = 'approved' and alert_acked_at is null;
create index donations_ip_created
  on public.donations (ip_hash, created_at);

-- RLS: เจ้าของอ่านรายการของตัวเองได้ (F5/F6 + realtime) นอกนั้นผ่าน API (secret key)
alter table public.donations enable row level security;
create policy "streamer can read own donations" on public.donations
  for select to authenticated using ((select auth.uid()) = streamer_id);
revoke all on public.donations from anon;
revoke insert, update, delete on public.donations from authenticated;

-- F15 สมัครเป็นสตรีมเมอร์: ต้องได้รับอนุมัติจากแอดมินก่อนใช้ dashboard
-- เพิ่มอย่างเดียว: โค้ดเวอร์ชันก่อนหน้าไม่อ่านคอลัมน์/ตารางใหม่
create type public.streamer_status as enum (
  'pending_application', -- ยังไม่ส่งฟอร์ม
  'pending',             -- ส่งแล้ว รอแอดมิน
  'approved',
  'rejected',            -- แก้แล้วส่งใหม่ได้
  'suspended'
);

-- ผู้ใช้เดิมทั้งหมด = อนุมัติแล้ว (ค่า default ตอน add column ใส่ให้ทุกแถวเดิม)
alter table public.profiles
  add column streamer_status public.streamer_status not null default 'approved',
  add column status_note text check (char_length(status_note) <= 300);
-- ผู้ใช้ใหม่หลังจากนี้ต้องสมัคร
alter table public.profiles
  alter column streamer_status set default 'pending_application';

-- ใบสมัคร (1 แถว/ผู้ใช้ ส่งใหม่ทับ) — มีข้อมูลส่วนบุคคล: เห็นเฉพาะเจ้าของ + แอดมิน (ผ่าน server)
create table public.streamer_applications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  real_name text not null check (char_length(real_name) between 2 and 100),
  phone text not null check (phone ~ '^0[689][0-9]{8}$'),
  channel_urls text[] not null
    check (cardinality(channel_urls) between 1 and 3),
  image_paths text[] not null
    check (cardinality(image_paths) between 1 and 3),
  pdpa_version text not null,
  pdpa_accepted_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

alter table public.streamer_applications enable row level security;
create policy "owner reads own application"
  on public.streamer_applications for select to authenticated
  using (user_id = (select auth.uid()));

create index profiles_streamer_status on public.profiles (streamer_status);

-- รูปหน้าช่อง (private, server เท่านั้น — เจ้าของ/แอดมินดูผ่าน signed URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applications', 'applications', false, 4 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

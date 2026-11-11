-- F9/F10: รูปสลิป (private, server เท่านั้น — สตรีมเมอร์ดูผ่าน signed URL ใน F5)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 4 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- error ระดับระบบที่แอดมินต้องเห็น (F12) เช่น key/โควตา SlipOK
create table public.system_errors (
  id bigint generated always as identity primary key,
  source text not null,
  code text not null,
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);
create index system_errors_created on public.system_errors (created_at desc);

alter table public.system_errors enable row level security;
revoke all on public.system_errors from anon, authenticated;

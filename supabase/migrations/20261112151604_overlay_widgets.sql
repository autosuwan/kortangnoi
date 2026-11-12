-- F14: overlay เพิ่มเติม (Goal / QR / อันดับ / โดเนทล่าสุด) — ค่าตั้ง 1 แถวต่อผู้ใช้
create table public.overlay_widgets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  goal_title text not null default 'เป้าหมายโดเนท'
    check (char_length(goal_title) between 1 and 40),
  goal_target_satang int not null default 100000
    check (goal_target_satang between 100 and 10000000),
  goal_started_at timestamptz not null default now(),
  qr_caption text not null default 'สแกนเพื่อโดเนท'
    check (char_length(qr_caption) between 1 and 40),
  top_period text not null default 'month'
    check (top_period in ('today', 'month', 'all')),
  top_count smallint not null default 5 check (top_count between 3 and 10),
  recent_count smallint not null default 10 check (recent_count between 3 and 20),
  updated_at timestamptz not null default now()
);

create trigger overlay_widgets_set_updated_at
  before update on public.overlay_widgets
  for each row execute function public.set_updated_at();

-- สร้างแถวพร้อม profile ใหม่ (แยก trigger ไม่ต้องแก้ handle_new_user)
create function public.create_overlay_widgets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.overlay_widgets (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_overlay_widgets
  after insert on public.profiles
  for each row execute function public.create_overlay_widgets();

-- ผู้ใช้เดิม
insert into public.overlay_widgets (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- RLS: เจ้าของอ่านได้อย่างเดียว เขียนผ่าน API (secret key) เท่านั้น
alter table public.overlay_widgets enable row level security;

create policy "owner can read overlay widgets" on public.overlay_widgets
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.overlay_widgets from anon;
revoke insert, update, delete on public.overlay_widgets from authenticated;

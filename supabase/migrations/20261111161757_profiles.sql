-- F1: profiles + ตารางตั้งค่า (ดู docs/er.md)

create extension if not exists citext with schema extensions;

create type public.promptpay_type as enum ('phone', 'national_id');
create type public.alert_media_type as enum ('default', 'gif', 'upload');

-- updated_at อัตโนมัติ
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_-]{3,20}$'),
  display_name text not null default ''
    constraint profiles_display_name_length check (char_length(display_name) <= 50),
  discord_id text unique,
  overlay_token text not null unique
    default translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- settings (1:1 กับ profiles)
-- ---------------------------------------------------------------------------
create table public.payment_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  promptpay_type public.promptpay_type not null default 'phone',
  promptpay_id text not null default ''
    constraint payment_settings_promptpay_id_digits check (promptpay_id ~ '^[0-9]*$'),
  account_name_th text not null default '',
  account_name_en text,
  show_account_name boolean not null default true,
  min_amount_satang int not null default 2000
    constraint payment_settings_min_amount check (min_amount_satang between 100 and 1000000),
  updated_at timestamptz not null default now()
);

create table public.alert_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  media_type public.alert_media_type not null default 'default',
  media_url text,
  media_storage_path text,
  duration_sec smallint not null default 8
    constraint alert_settings_duration check (duration_sec between 3 and 20),
  sound_enabled boolean not null default true,
  volume smallint not null default 80
    constraint alert_settings_volume check (volume between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.webhook_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  discord_webhook_url text,
  updated_at timestamptz not null default now()
);

create trigger payment_settings_set_updated_at
  before update on public.payment_settings
  for each row execute function public.set_updated_at();
create trigger alert_settings_set_updated_at
  before update on public.alert_settings
  for each row execute function public.set_updated_at();
create trigger webhook_settings_set_updated_at
  before update on public.webhook_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- สร้าง profile + settings อัตโนมัติเมื่อมีผู้ใช้ใหม่ใน auth.users
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discord_id text;
  v_display_name text;
begin
  if new.raw_app_meta_data ->> 'provider' = 'discord' then
    v_discord_id := new.raw_user_meta_data ->> 'provider_id';
  end if;

  v_display_name := left(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  ), 50);

  insert into public.profiles (id, display_name, discord_id)
  values (new.id, v_display_name, v_discord_id);

  insert into public.payment_settings (user_id) values (new.id);
  insert into public.alert_settings (user_id) values (new.id);
  insert into public.webhook_settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: เจ้าของอ่าน/แก้แถวตัวเองได้ ที่เหลือผ่าน server (secret key)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.payment_settings enable row level security;
alter table public.alert_settings enable row level security;
alter table public.webhook_settings enable row level security;

create policy "owner can read profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "owner can update profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "owner can read payment settings" on public.payment_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner can update payment settings" on public.payment_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner can read alert settings" on public.alert_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner can update alert settings" on public.alert_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner can read webhook settings" on public.webhook_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner can update webhook settings" on public.webhook_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- client (authenticated) แก้ได้เฉพาะคอลัมน์ที่ปลอดภัย: ห้ามแตะ id / overlay_token / discord_id
revoke update on public.profiles from authenticated;
grant update (username, display_name) on public.profiles to authenticated;

-- anon ไม่มีสิทธิ์ใดๆ กับตารางเหล่านี้ (หน้า public ผ่าน API ของเรา)
revoke all on public.profiles, public.payment_settings, public.alert_settings, public.webhook_settings
  from anon;

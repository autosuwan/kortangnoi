-- ตั้งค่าโปรไฟล์: ชื่อจริง (จาก auth, ส่วนตัว) แยกจากชื่อที่แสดงบนหน้าโดเนท + รูปโปรไฟล์/แบนเนอร์/แนะนำตัว
alter table public.profiles
  add column real_name text not null default ''
    constraint profiles_real_name_length check (char_length(real_name) <= 100),
  add column bio text
    constraint profiles_bio_length check (bio is null or char_length(bio) <= 160),
  add column avatar_url text,
  add column avatar_path text,
  add column banner_url text,
  add column banner_path text;

-- ข้อมูลเดิม: display_name เคยมาจาก auth → ย้ายไปเป็นชื่อจริง แล้วให้ชื่อที่แสดง = username
update public.profiles set real_name = display_name;
update public.profiles set display_name = username::text where username is not null;
update public.profiles set display_name = '' where username is null;

-- ผู้ใช้ใหม่: ชื่อจาก Google/Discord เป็นชื่อจริง; ชื่อที่แสดงตั้งเป็น username ตอน onboarding
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discord_id text;
  v_real_name text;
begin
  if new.raw_app_meta_data ->> 'provider' = 'discord' then
    v_discord_id := new.raw_user_meta_data ->> 'provider_id';
  end if;

  v_real_name := left(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  ), 100);

  insert into public.profiles (id, real_name, discord_id)
  values (new.id, v_real_name, v_discord_id);

  insert into public.payment_settings (user_id) values (new.id);
  insert into public.alert_settings (user_id) values (new.id);
  insert into public.webhook_settings (user_id) values (new.id);

  return new;
end;
$$;

-- แก้โปรไฟล์ผ่าน API เท่านั้น (validate + จัดการรูปใน storage)
revoke update on public.profiles from authenticated;
drop policy if exists "owner can update profile" on public.profiles;

-- รูปโปรไฟล์/แบนเนอร์: public อ่านได้ (หน้าโดเนท) เขียนผ่าน server เท่านั้น
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  4 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

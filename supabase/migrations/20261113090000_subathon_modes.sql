-- F14 Subathon: โหมด auto/manual + คนดูเลือกเพิ่ม/ลดเวลา
-- เพิ่มคอลัมน์/ฟังก์ชันอย่างเดียว โค้ดเวอร์ชันก่อนหน้าไม่อ่านสิ่งเหล่านี้จึงไม่พัง
alter table public.overlay_widgets
  add column timer_mode text not null default 'auto'
    check (timer_mode in ('auto', 'manual')),
  add column timer_allow_subtract boolean not null default false;

alter table public.donations
  add column timer_direction text not null default 'add'
    check (timer_direction in ('add', 'subtract')),
  -- วินาทีที่ใช้กับ timer จริง (ลบ = ลดเวลา) และเวลาที่ใช้ — กันใช้ซ้ำ
  add column timer_applied_sec int,
  add column timer_applied_at timestamptz,
  add constraint donations_timer_applied_pair
    check ((timer_applied_sec is null) = (timer_applied_at is null));

-- ใช้เวลาของโดเนท 1 รายการกับ timer (atomic: ล็อกแถวโดเนท + timer ในธุรกรรมเดียว)
-- p_seconds ติดลบ = ลดเวลา (ไม่ต่ำกว่า 0) · เปลี่ยนเฉพาะตอนกำลังนับ (ยังไม่หมด) หรือพัก (ยังเหลือเวลา)
-- คืน 'applied' | 'already' | 'inactive' | 'not_found'
create function public.subathon_apply_donation(p_donation uuid, p_seconds int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_status text;
  v_applied timestamptz;
  w record;
  v_actual int;
begin
  select streamer_id, status::text, timer_applied_at
    into v_user, v_status, v_applied
  from public.donations
  where id = p_donation
  for update;
  if not found or v_status <> 'approved' then
    return 'not_found';
  end if;
  if v_applied is not null then
    return 'already';
  end if;
  if p_seconds = 0 or p_seconds not between -86400 * 7 and 86400 * 7 then
    return 'inactive';
  end if;

  select timer_status, timer_ends_at, timer_remaining_sec
    into w
  from public.overlay_widgets
  where user_id = v_user
  for update;
  if not found then
    return 'inactive';
  end if;

  if w.timer_status = 'running' and w.timer_ends_at > now() then
    update public.overlay_widgets
    set timer_ends_at = greatest(now(), w.timer_ends_at + make_interval(secs => p_seconds))
    where user_id = v_user;
    v_actual := case when p_seconds >= 0 then p_seconds
      else -least(-p_seconds,
        ceil(extract(epoch from (w.timer_ends_at - now())))::int) end;
  elsif w.timer_status = 'paused' and w.timer_remaining_sec > 0 then
    update public.overlay_widgets
    set timer_remaining_sec = greatest(0,
      least(w.timer_remaining_sec::bigint + p_seconds, 2147483647))::int
    where user_id = v_user;
    v_actual := case when p_seconds >= 0 then p_seconds
      else -least(-p_seconds, w.timer_remaining_sec) end;
  else
    return 'inactive';
  end if;

  update public.donations
  set timer_applied_sec = v_actual, timer_applied_at = now()
  where id = p_donation;
  return 'applied';
end;
$$;

revoke all on function public.subathon_apply_donation(uuid, int) from public, anon, authenticated;
grant execute on function public.subathon_apply_donation(uuid, int) to service_role;

-- F14 Subathon timer: นับถอยหลังบน OBS โดเนทผ่านแล้วเวลาเพิ่ม
-- เพิ่มคอลัมน์อย่างเดียว โค้ดเวอร์ชันก่อนหน้าไม่อ่านคอลัมน์เหล่านี้จึงไม่พัง
alter table public.overlay_widgets
  add column timer_status text not null default 'idle'
    check (timer_status in ('idle', 'running', 'paused')),
  -- กำลังนับ: เวลาจบ (เวลาคงเหลือ = ends_at - now())
  add column timer_ends_at timestamptz,
  -- หยุดชั่วคราว: วินาทีที่เหลือ
  add column timer_remaining_sec int not null default 0
    check (timer_remaining_sec >= 0),
  add column timer_initial_sec int not null default 3600
    check (timer_initial_sec between 60 and 86400),
  add column timer_step_satang int not null default 1000
    check (timer_step_satang between 100 and 10000000),
  add column timer_step_seconds int not null default 60
    check (timer_step_seconds between 1 and 86400),
  add column timer_label text not null default 'Subathon'
    check (char_length(timer_label) between 1 and 40),
  add constraint overlay_widgets_timer_running_has_end
    check (timer_status <> 'running' or timer_ends_at is not null);

-- เพิ่มเวลาจากโดเนท (atomic ในคำสั่งเดียว กันโดเนทพร้อมกันแล้วเวลาหาย)
-- เพิ่มเฉพาะตอนกำลังนับ (ยังไม่หมดเวลา) หรือหยุดชั่วคราว (ยังเหลือเวลา)
create function public.subathon_add_seconds(p_user uuid, p_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated int;
begin
  if p_seconds <= 0 then
    return false;
  end if;
  update public.overlay_widgets
  set
    timer_ends_at = case
      when timer_status = 'running'
        then timer_ends_at + make_interval(secs => p_seconds)
      else timer_ends_at end,
    timer_remaining_sec = case
      when timer_status = 'paused'
        then least(timer_remaining_sec + p_seconds, 2147483647)
      else timer_remaining_sec end
  where user_id = p_user
    and (
      (timer_status = 'running' and timer_ends_at > now())
      or (timer_status = 'paused' and timer_remaining_sec > 0)
    );
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ปุ่มควบคุมใน dashboard: start | pause | resume | reset | adjust
-- คืน false ถ้าสถานะตอนนี้ทำ action นั้นไม่ได้
create function public.subathon_control(
  p_user uuid,
  p_action text,
  p_seconds int default 0
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated int;
begin
  if p_action = 'start' then
    update public.overlay_widgets
    set timer_status = 'running',
        timer_ends_at = now() + make_interval(secs => timer_initial_sec),
        timer_remaining_sec = 0
    where user_id = p_user and timer_status = 'idle';
  elsif p_action = 'pause' then
    update public.overlay_widgets
    set timer_status = 'paused',
        timer_remaining_sec = greatest(
          0, ceil(extract(epoch from (timer_ends_at - now())))::int),
        timer_ends_at = null
    where user_id = p_user and timer_status = 'running'
      and timer_ends_at > now();
  elsif p_action = 'resume' then
    update public.overlay_widgets
    set timer_status = 'running',
        timer_ends_at = now() + make_interval(secs => timer_remaining_sec),
        timer_remaining_sec = 0
    where user_id = p_user and timer_status = 'paused'
      and timer_remaining_sec > 0;
  elsif p_action = 'reset' then
    update public.overlay_widgets
    set timer_status = 'idle', timer_ends_at = null, timer_remaining_sec = 0
    where user_id = p_user;
  elsif p_action = 'adjust' then
    -- ปรับเวลาเอง: ไม่ต่ำกว่า 0; กำลังนับแต่หมดเวลาแล้ว + เวลา = นับต่อจากตอนนี้
    update public.overlay_widgets
    set timer_ends_at = case
          when timer_status = 'running' then greatest(
            now(),
            greatest(timer_ends_at, now()) + make_interval(secs => p_seconds))
          else timer_ends_at end,
        timer_remaining_sec = case
          when timer_status = 'paused'
            then greatest(0, timer_remaining_sec + p_seconds)
          else timer_remaining_sec end
    where user_id = p_user and timer_status in ('running', 'paused')
      and p_seconds between -86400 and 86400;
  else
    raise exception 'unknown subathon action: %', p_action;
  end if;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- เรียกได้เฉพาะ server (secret key) — client เรียกตรงแล้วโกงเวลาไม่ได้
revoke all on function public.subathon_add_seconds(uuid, int) from public, anon, authenticated;
revoke all on function public.subathon_control(uuid, text, int) from public, anon, authenticated;
grant execute on function public.subathon_add_seconds(uuid, int) to service_role;
grant execute on function public.subathon_control(uuid, text, int) to service_role;

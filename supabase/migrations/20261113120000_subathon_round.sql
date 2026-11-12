-- F14 Subathon: จำเวลาเริ่มรอบ เพื่อให้เมนู Subathon แสดงเฉพาะโดเนทของรอบนี้
-- เพิ่มคอลัมน์ + แทนที่ฟังก์ชันด้วย signature เดิม (โค้ดเวอร์ชันก่อนหน้าเรียกได้เหมือนเดิม)
alter table public.overlay_widgets
  add column timer_started_at timestamptz;

create or replace function public.subathon_control(
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
        timer_remaining_sec = 0,
        timer_started_at = now()
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

revoke all on function public.subathon_control(uuid, text, int) from public, anon, authenticated;
grant execute on function public.subathon_control(uuid, text, int) to service_role;

-- ============================================================================
-- Guard status antrean + estimasi tunggu dinamis. Aman dijalankan berulang.
--  * crew_queue_complete hanya berlaku untuk tiket aktif (called/heading/serving) dan mengembalikan null bila
--    sudah diproses petugas lain, sehingga satu tiket tidak pernah tercatat sebagai dua sesi foto.
--  * start/recall/skip/requeue hanya berlaku dari status yang masuk akal.
--  * queue_state_for menghitung avg_service_seconds dari 10 tamu terakhir (default 5 menit).
-- ============================================================================

create or replace function public.queue_state_for(p_event_id bigint, p_ticket_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event jsonb;
  v_board jsonb;
  v_ticket jsonb;
  v_done int;
  v_avg numeric;
begin
  select jsonb_build_object('id', e.id, 'name', e.name, 'date', e.date, 'queue_open', coalesce(e.queue_open, true))
  into v_event from public.financial_events e where e.id = p_event_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id,
      'queue_number', q.queue_number,
      'seq_number', q.seq_number,
      'status', q.status,
      'name', split_part(q.customer_name, ' ', 1),
      'called_at', q.called_at,
      'called_count', q.called_count) order by q.seq_number), '[]'::jsonb)
  into v_board
  from (
    select * from public.event_queues
    where event_id = p_event_id and status in ('waiting','called','heading','serving')
    order by seq_number
    limit 300
  ) q;

  select count(*) into v_done from public.event_queues
  where event_id = p_event_id and status = 'completed';

  -- Rata-rata durasi layanan 10 tamu terakhir (1-30 menit); minimal 2 data, jika belum ada dipakai 5 menit.
  select least(greatest(avg(extract(epoch from (x.completed_at - x.called_at))), 60), 1800)
  into v_avg
  from (
    select completed_at, called_at from public.event_queues
    where event_id = p_event_id and status = 'completed'
      and completed_at is not null and called_at is not null and completed_at > called_at
    order by completed_at desc
    limit 10
  ) x
  having count(*) >= 2;
  v_avg := coalesce(v_avg, 300);

  if p_ticket_id is not null then
    select jsonb_build_object(
      'id', q.id,
      'queue_number', q.queue_number,
      'seq_number', q.seq_number,
      'status', q.status,
      'customer_name', q.customer_name,
      'called_at', q.called_at,
      'called_count', q.called_count)
    into v_ticket
    from public.event_queues q
    where q.id = p_ticket_id and q.event_id = p_event_id;
  end if;

  return jsonb_build_object(
    'event', v_event, 'board', v_board, 'completed_count', v_done,
    'avg_service_seconds', round(v_avg), 'ticket', v_ticket);
end $$;

create or replace function public.crew_queue_complete(
  p_token text,
  p_id uuid,
  p_auto_session boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
  v_row public.event_queues%rowtype;
  v_session_id text;
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;

  update public.event_queues
  set status = 'completed', completed_at = now()
  where id = p_id and event_id = v_event_id and status in ('called','heading','serving')
  returning * into v_row;

  -- Sudah diselesaikan/dilewati petugas lain: jangan catat sesi kedua.
  if not found then return null; end if;

  if p_auto_session then
    v_session_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
    update public.financial_events
    set sessions = sessions || jsonb_build_array(jsonb_build_object(
      'id', v_session_id,
      'queue_number', v_row.queue_number,
      'no_voucher', coalesce(v_row.no_voucher, false),
      'prints', greatest(0, least(coalesce(v_row.prints, 0), 50)),
      'created_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
    where id = v_event_id
      and not exists (select 1 from jsonb_array_elements(sessions) s where s->>'id' = v_session_id);
    perform public.recalc_event_finance(v_event_id);
  end if;

  return to_jsonb(v_row);
end $$;

create or replace function public.crew_queue_start(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;

  update public.event_queues
  set status = 'serving'
  where id = p_id and event_id = v_event_id and status in ('called','heading');

  return found;
end $$;

create or replace function public.crew_queue_recall(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
  v_row public.event_queues%rowtype;
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;

  update public.event_queues
  set status = 'called', called_at = now(), called_count = coalesce(called_count, 0) + 1
  where id = p_id and event_id = v_event_id and status in ('called','heading')
  returning * into v_row;

  if not found then return null; end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.crew_queue_skip(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;

  update public.event_queues
  set status = 'skipped'
  where id = p_id and event_id = v_event_id and status in ('waiting','called','heading','serving');

  return found;
end $$;

create or replace function public.crew_queue_requeue(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;

  update public.event_queues
  set status = 'waiting'
  where id = p_id and event_id = v_event_id and status in ('skipped','cancelled');

  return found;
end $$;

grant execute on function public.queue_state_for(bigint, uuid) to anon, authenticated;
grant execute on function public.crew_queue_complete(text, uuid, boolean) to anon, authenticated;
grant execute on function public.crew_queue_start(text, uuid) to anon, authenticated;
grant execute on function public.crew_queue_recall(text, uuid) to anon, authenticated;
grant execute on function public.crew_queue_skip(text, uuid) to anon, authenticated;
grant execute on function public.crew_queue_requeue(text, uuid) to anon, authenticated;

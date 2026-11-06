-- ============================================================================
-- Sinkronisasi antrean <-> sesi foto.
--  1. Sesi yang dicatat otomatis dari antrean kini menyimpan 'queue_number' (mis. A-03), sehingga riwayat
--     di menu Sesi Foto menunjukkan tiket asalnya.
--  2. Tabel event_queues didaftarkan ke publikasi realtime (untuk panel admin yang login).
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.crew_queue_call_next(
  p_token text,
  p_auto_session boolean default true,
  p_current_action text default 'complete'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
  v_cur public.event_queues%rowtype;
  v_next public.event_queues%rowtype;
  v_session_id text;
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;
  if p_current_action not in ('complete', 'skip') then raise exception 'Aksi tidak valid'; end if;

  perform 1 from public.financial_events where id = v_event_id for update;

  select * into v_cur from public.event_queues
  where event_id = v_event_id and status in ('called','heading','serving')
  order by called_at desc nulls last limit 1;

  if found and v_cur.called_at is not null and v_cur.called_at > now() - interval '2 seconds' then
    return to_jsonb(v_cur);
  end if;

  select * into v_next from public.event_queues
  where event_id = v_event_id and status = 'waiting'
  order by seq_number limit 1 for update;

  if not found then return null; end if;

  for v_cur in
    select * from public.event_queues
    where event_id = v_event_id and status in ('called','heading','serving')
  loop
    if p_current_action = 'skip' then
      update public.event_queues set status = 'skipped' where id = v_cur.id;
    else
      update public.event_queues set status = 'completed', completed_at = now() where id = v_cur.id;
      if p_auto_session then
        v_session_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
        update public.financial_events
        set sessions = sessions || jsonb_build_array(jsonb_build_object(
          'id', v_session_id,
          'queue_number', v_cur.queue_number,
          'no_voucher', coalesce(v_cur.no_voucher, false),
          'prints', greatest(0, least(coalesce(v_cur.prints, 0), 50)),
          'created_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
        where id = v_event_id
          and not exists (select 1 from jsonb_array_elements(sessions) s where s->>'id' = v_session_id);
        perform public.recalc_event_finance(v_event_id);
      end if;
    end if;
  end loop;

  update public.event_queues
  set status = 'called', called_at = now(), called_count = coalesce(called_count, 0) + 1
  where id = v_next.id
  returning * into v_next;

  return to_jsonb(v_next);
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
  where id = p_id and event_id = v_event_id
  returning * into v_row;

  if not found then raise exception 'Antrian tidak ditemukan'; end if;

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

grant execute on function public.crew_queue_call_next(text, boolean, text) to anon, authenticated;
grant execute on function public.crew_queue_complete(text, uuid, boolean) to anon, authenticated;

-- Realtime: panel admin (login) menerima perubahan antrean seketika. Tamu/TV/kru tanpa login tidak punya
-- akses SELECT ke tabel, jadi mereka tetap memakai polling (1,5-5 detik) lewat RPC.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_queues') then
    alter publication supabase_realtime add table public.event_queues;
  end if;
end $$;

-- ============================================================================
-- Pengerasan token antrean, buka/tutup antrean, akses admin, dan data live lengkap.
-- Aman dijalankan berulang. Jalankan di SQL Editor Supabase.
--
--  1. queue_event_id      : hanya queue_token (>= 8 karakter). Sebelumnya juga menerima share_token & id event.
--  2. queue_crew_event_id : hanya queue_crew_token (>= 8 karakter), atau 'admin:<id>' untuk admin yang login.
--     Sebelumnya menerima queue_token (token publik di QR tamu) dan id event yang bisa ditebak, sehingga
--     siapa pun bisa memanggil/menghapus antrean lewat RPC crew_queue_*.
--  3. queue_open          : buka/tutup antrean tersimpan di database; take_queue_ticket menolak saat ditutup.
--  4. get_live_event      : tambah pricing_mode, share_percent, sharing_amount (benar pada mode persentase).
--  5. admin_event_list    : daftar acara ringan (tanpa JSON sesi) untuk panel admin.
-- ============================================================================

alter table public.financial_events add column if not exists queue_open boolean not null default true;

create or replace function public.queue_event_id(p_token text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.financial_events
  where p_token is not null and length(p_token) >= 8 and queue_token = p_token
  limit 1;
$$;

create or replace function public.queue_crew_event_id(p_token text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  -- Kru memakai queue_crew_token (>= 8 karakter). Admin yang login memakai 'admin:<id>' sehingga panel admin
  -- tetap berfungsi walau link kru dinonaktifkan atau dibuat ulang. Anon tidak pernah lolos jalur admin.
  select id from public.financial_events
  where p_token is not null and (
    (length(p_token) >= 8 and queue_crew_token = p_token)
    or (auth.role() = 'authenticated' and p_token = 'admin:' || id::text)
  )
  limit 1;
$$;

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
  v_avg numeric := 300;
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

create or replace function public.take_queue_ticket(
  p_token text,
  p_name text default '',
  p_phone text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_event_id(p_token);
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 40);
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_next int;
  v_row public.event_queues%rowtype;
begin
  if v_event_id is null then
    raise exception 'Link antrian tidak valid';
  end if;

  perform 1 from public.financial_events where id = v_event_id for update;

  if not coalesce((select queue_open from public.financial_events where id = v_event_id), true) then
    raise exception 'Antrean sedang ditutup';
  end if;

  if (select count(*) from public.event_queues
      where event_id = v_event_id and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'Terlalu banyak permintaan, coba lagi sebentar';
  end if;

  select coalesce(max(seq_number), 0) + 1 into v_next from public.event_queues where event_id = v_event_id;

  insert into public.event_queues (event_id, queue_number, seq_number, customer_name, customer_phone, status)
  values (v_event_id, 'A-' || lpad(v_next::text, 2, '0'), v_next, v_name, v_phone, 'waiting')
  returning * into v_row;

  return jsonb_build_object(
    'existing', false,
    'id', v_row.id,
    'queue_number', v_row.queue_number,
    'seq_number', v_row.seq_number,
    'status', v_row.status,
    'customer_name', v_row.customer_name,
    'called_at', v_row.called_at,
    'called_count', v_row.called_count,
    'state', public.queue_state_for(v_event_id, v_row.id)
  );
end $$;

create or replace function public.get_crew_queue_data(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
  v_event jsonb;
  v_queues jsonb;
begin
  if v_event_id is null then return null; end if;

  select jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'date', e.date,
    'queue_token', e.queue_token,
    'queue_open', coalesce(e.queue_open, true),
    'pricing_mode', coalesce(e.pricing_mode, 'voucher'),
    'session_price', coalesce(e.session_price, 45000),
    'voucher_price', coalesce(e.voucher_price, 30000),
    'no_voucher_price', coalesce(e.no_voucher_price, 35000),
    'print_price', coalesce(e.print_price, 10000)
  )
  into v_event
  from public.financial_events e
  where e.id = v_event_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'event_id', q.event_id,
    'queue_number', q.queue_number,
    'seq_number', q.seq_number,
    'customer_name', q.customer_name,
    'customer_phone', q.customer_phone,
    'status', q.status,
    'called_count', q.called_count,
    'called_at', q.called_at,
    'created_at', q.created_at,
    'prints', coalesce(q.prints, 0),
    'no_voucher', coalesce(q.no_voucher, false)
  ) order by q.seq_number), '[]'::jsonb)
  into v_queues
  from public.event_queues q
  where q.event_id = v_event_id;

  return jsonb_build_object('event', v_event, 'queues', v_queues);
end $$;

create or replace function public.crew_queue_set_open(p_token text, p_open boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint := public.queue_crew_event_id(p_token);
begin
  if v_event_id is null then raise exception 'Akses tidak sah'; end if;
  update public.financial_events set queue_open = coalesce(p_open, true) where id = v_event_id;
  return coalesce(p_open, true);
end $$;

create or replace function public.get_live_event(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', e.name,
    'date', e.date,
    'pricing_mode', coalesce(e.pricing_mode, 'voucher'),
    'share_percent', e.share_percent,
    'share_per_voucher', e.share_per_voucher,
    'sharing_amount', coalesce((select sum(t.amount) from public.transactions t
                                where t.event_id = e.id and t.auto_source = 'sharing_profit'), 0),
    'sessions', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'id', s->>'id',
          'no_voucher', coalesce((s->>'no_voucher')::boolean, false),
          'created_at', s->>'created_at') order by ord)
       from jsonb_array_elements(e.sessions) with ordinality as t(s, ord)),
      '[]'::jsonb)
  )
  from public.financial_events e
  where p_token is not null and length(p_token) >= 8 and e.share_token = p_token
  limit 1;
$$;

-- Daftar acara ringan untuk panel admin: tanpa JSON sesi (bisa ribuan baris), hanya jumlah sesi dan pemasukan.
create or replace function public.admin_event_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'name', e.name, 'date', e.date, 'venue', e.venue, 'income', e.income,
      'session_count', jsonb_array_length(coalesce(e.sessions, '[]'::jsonb)),
      'pricing_mode', e.pricing_mode, 'voucher_price', e.voucher_price, 'no_voucher_price', e.no_voucher_price,
      'session_price', e.session_price, 'print_price', e.print_price,
      'share_per_voucher', e.share_per_voucher, 'share_percent', e.share_percent,
      'queue_token', e.queue_token, 'queue_crew_token', e.queue_crew_token,
      'share_token', e.share_token, 'crew_token', e.crew_token, 'queue_open', e.queue_open
    ) order by e.date desc)
    from public.financial_events e
  ), '[]'::jsonb);
end $$;

revoke execute on function public.admin_event_list() from public, anon;
grant execute on function public.admin_event_list() to authenticated;

grant execute on function public.queue_event_id(text) to anon, authenticated;
grant execute on function public.queue_crew_event_id(text) to anon, authenticated;
grant execute on function public.queue_state_for(bigint, uuid) to anon, authenticated;
grant execute on function public.take_queue_ticket(text, text, text) to anon, authenticated;
grant execute on function public.get_crew_queue_data(text) to anon, authenticated;
grant execute on function public.crew_queue_set_open(text, boolean) to anon, authenticated;
grant execute on function public.get_live_event(text) to anon, authenticated;

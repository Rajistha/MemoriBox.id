-- Jalankan sekali di Supabase SQL Editor pada database yang sudah ada.
-- Menyelaraskan kolom tabel dengan panel admin (Invoice, Galeri, Ulasan, Logo). Aman dijalankan berulang.
alter table public.documents       add column if not exists data jsonb;
alter table public.gallery_images  add column if not exists span text default '';
alter table public.reviews         add column if not exists client_name text;
alter table public.reviews         add column if not exists event_type text;
alter table public.reviews         alter column name drop not null;
alter table public.client_logos    add column if not exists client_name text;
alter table public.client_logos    add column if not exists logo_url text;
alter table public.client_logos    add column if not exists instagram_url text;
alter table public.client_logos    alter column name drop not null;
alter table public.client_logos    alter column image_url drop not null;

-- Shortlink: kolom untuk panel admin + RPC pencatat klik (dipakai redirect di memoribox.id/:slug)
alter table public.short_links add column if not exists title text default '';
alter table public.short_links add column if not exists is_active boolean not null default true;

create or replace function public.track_short_click(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dest text;
begin
  update public.short_links
     set clicks = clicks + 1
   where slug = p_slug and is_active
   returning destination into v_dest;
  return v_dest;
end;
$$;
grant execute on function public.track_short_click(text) to anon, authenticated;

-- KEAMANAN: cabut akses tulis publik (anon). Setelah ini hanya admin yang sudah login yang bisa menulis.
drop policy if exists "Anon full financial_events dev" on public.financial_events;
drop policy if exists "Anon full transactions dev" on public.transactions;
drop policy if exists "Anon full settings dev" on public.settings;
drop policy if exists "Anon full gallery dev" on public.gallery_images;
drop policy if exists "Anon full logos dev" on public.client_logos;
drop policy if exists "Anon full reviews dev" on public.reviews;
drop policy if exists "Anon full documents dev" on public.documents;
drop policy if exists "Public upload to gallery bucket" on storage.objects;
drop policy if exists "Public delete in gallery bucket" on storage.objects;
drop policy if exists "Auth upload to gallery bucket" on storage.objects;
drop policy if exists "Auth delete in gallery bucket" on storage.objects;
create policy "Auth upload to gallery bucket" on storage.objects for insert to authenticated with check (bucket_id in ('gallery', 'logos', 'pricelist', 'avatars'));
create policy "Auth delete in gallery bucket" on storage.objects for delete to authenticated using (bucket_id in ('gallery', 'logos', 'pricelist', 'avatars'));

drop policy if exists "Anon insert booked dates" on public.booked_dates;
drop policy if exists "Anon delete booked dates" on public.booked_dates;
drop policy if exists "Anon update booked dates" on public.booked_dates;

-- Statistik pemakaian untuk menu Server (hanya role authenticated).
create or replace function public.admin_usage_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'pg_version', current_setting('server_version'),
    'started_at', pg_postmaster_start_time(),
    'db_size_bytes', pg_database_size(current_database()),
    'connections', (select count(*) from pg_stat_activity where datname = current_database()),
    'max_connections', current_setting('max_connections')::int,
    'auth_users', (select count(*) from auth.users),
    'tables', coalesce((
      select jsonb_agg(t order by t.size_bytes desc)
      from (
        select c.relname as name,
               greatest(c.reltuples, 0)::bigint as rows_estimate,
               pg_total_relation_size(c.oid) as size_bytes
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
      ) t
    ), '[]'::jsonb),
    'buckets', coalesce((
      select jsonb_agg(b order by b.bytes desc)
      from (
        select bk.name as bucket,
               bk.public as is_public,
               count(o.id) as files,
               coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes
        from storage.buckets bk
        left join storage.objects o on o.bucket_id = bk.id
        group by bk.name, bk.public
      ) b
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_usage_stats() from public, anon;
grant execute on function public.admin_usage_stats() to authenticated;

-- Pencatat klik bio-link (halaman publik link.memoribox.id). Menaikkan 'clicks' pada key 'linktree' di tabel settings.
create or replace function public.track_link_click(p_link_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_val jsonb;
  updated_arr jsonb := '[]'::jsonb;
  elem jsonb;
begin
  select value into current_val from public.settings where key = 'linktree';
  if current_val is null or current_val->'links' is null then
    return;
  end if;

  for elem in select * from jsonb_array_elements(current_val->'links')
  loop
    if elem->>'id' = p_link_id then
      elem := jsonb_set(elem, '{clicks}', to_jsonb(coalesce((elem->>'clicks')::int, 0) + 1));
    end if;
    updated_arr := updated_arr || jsonb_build_array(elem);
  end loop;

  update public.settings
     set value = jsonb_set(current_val, '{links}', updated_arr), updated_at = now()
   where key = 'linktree';
end;
$$;
grant execute on function public.track_link_click(text) to anon, authenticated;

-- ============================================================================
-- SESI FOTO LIVE: halaman pelanggan (live.memoribox.id), input kru, dan pencatatan admin.
-- Akses anon hanya lewat fungsi di bawah dan wajib token cocok; tabel tetap terkunci.
-- ============================================================================
drop function if exists public.crew_add_session(text, boolean, int);

-- Data untuk pelanggan: tanpa harga, jumlah cetak, maupun keuntungan.
create or replace function public.get_live_event(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', e.name,
    'date', e.date,
    'share_per_voucher', e.share_per_voucher,
    'sessions', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'id', s->>'id',
          'no_voucher', coalesce((s->>'no_voucher')::boolean, false),
          'created_at', s->>'created_at') order by ord)
       from jsonb_array_elements(e.sessions) with ordinality as t(s, ord)),
      '[]'::jsonb)
  )
  from public.financial_events e
  where p_token is not null and e.share_token = p_token
  limit 1;
$$;

-- Data untuk kru: sesi dan konfigurasi tarif.
create or replace function public.get_crew_event(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', e.name,
    'date', e.date,
    'pricing_mode', coalesce(e.pricing_mode, 'voucher'),
    'session_price', coalesce(e.session_price, 45000),
    'voucher_price', coalesce(e.voucher_price, 30000),
    'no_voucher_price', coalesce(e.no_voucher_price, 35000),
    'print_price', coalesce(e.print_price, 10000),
    'sessions', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'id', s->>'id',
          'no_voucher', coalesce((s->>'no_voucher')::boolean, false),
          'prints', coalesce((s->>'prints')::int, 0),
          'created_at', s->>'created_at') order by ord)
       from jsonb_array_elements(e.sessions) with ordinality as t(s, ord)),
      '[]'::jsonb)
  )
  from public.financial_events e
  where p_token is not null and e.crew_token = p_token
  limit 1;
$$;

-- Tambah satu sesi. p_id dibuat klien sehingga kirim ulang tidak membuat sesi ganda.
create or replace function public.crew_add_session(p_token text, p_id text, p_no_voucher boolean, p_prints integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_id bigint;
begin
  if p_token is null or p_id is null or length(p_id) not between 1 and 64 then
    return null;
  end if;

  select id into ev_id from public.financial_events where crew_token = p_token for update;
  if ev_id is null then return null; end if;

  update public.financial_events
  set sessions = sessions || jsonb_build_array(jsonb_build_object(
        'id', p_id,
        'no_voucher', coalesce(p_no_voucher, false),
        'prints', greatest(0, least(coalesce(p_prints, 0), 50)),
        'created_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
  where id = ev_id
    and not exists (select 1 from jsonb_array_elements(sessions) s where s->>'id' = p_id);

  perform public.recalc_event_finance(ev_id);
  return public.get_crew_event(p_token);
end $$;

create or replace function public.crew_delete_session(p_token text, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_id bigint;
begin
  if p_token is null or p_id is null then return null; end if;

  select id into ev_id from public.financial_events where crew_token = p_token for update;
  if ev_id is null then return null; end if;

  update public.financial_events
  set sessions = coalesce(
        (select jsonb_agg(s order by ord)
         from jsonb_array_elements(sessions) with ordinality as t(s, ord)
         where s->>'id' <> p_id),
        '[]'::jsonb)
  where id = ev_id;

  perform public.recalc_event_finance(ev_id);
  return public.get_crew_event(p_token);
end $$;

grant execute on function public.get_live_event(text) to anon, authenticated;
grant execute on function public.get_crew_event(text) to anon, authenticated;
grant execute on function public.crew_add_session(text, text, boolean, integer) to anon, authenticated;
grant execute on function public.crew_delete_session(text, text) to anon, authenticated;

-- Pencatatan admin (hanya user login): atomik, tidak menimpa catatan kru.
create or replace function public.admin_add_session(p_event_id bigint, p_id text, p_no_voucher boolean, p_prints integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;
  if p_id is null or length(p_id) not between 1 and 64 then return null; end if;

  perform 1 from public.financial_events where id = p_event_id for update;
  if not found then return null; end if;

  update public.financial_events
  set sessions = sessions || jsonb_build_array(jsonb_build_object(
        'id', p_id,
        'no_voucher', coalesce(p_no_voucher, false),
        'prints', greatest(0, least(coalesce(p_prints, 0), 50)),
        'created_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
  where id = p_event_id
    and not exists (select 1 from jsonb_array_elements(sessions) s where s->>'id' = p_id);

  perform public.recalc_event_finance(p_event_id);
  select jsonb_build_object('sessions', sessions, 'income', income) into result
  from public.financial_events where id = p_event_id;
  return result;
end $$;

create or replace function public.admin_delete_session(p_event_id bigint, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;

  perform 1 from public.financial_events where id = p_event_id for update;
  if not found then return null; end if;

  update public.financial_events
  set sessions = coalesce(
        (select jsonb_agg(s order by ord)
         from jsonb_array_elements(sessions) with ordinality as t(s, ord)
         where s->>'id' <> p_id),
        '[]'::jsonb)
  where id = p_event_id;

  perform public.recalc_event_finance(p_event_id);
  select jsonb_build_object('sessions', sessions, 'income', income) into result
  from public.financial_events where id = p_event_id;
  return result;
end $$;

revoke execute on function public.admin_add_session(bigint, text, boolean, integer) from public, anon;
revoke execute on function public.admin_delete_session(bigint, text) from public, anon;
grant execute on function public.admin_add_session(bigint, text, boolean, integer) to authenticated;
grant execute on function public.admin_delete_session(bigint, text) to authenticated;

-- Memoribox bukan studio: venue acara tidak lagi berisi nama studio.
alter table public.financial_events alter column venue set default '';
update public.financial_events set venue = '' where venue = 'Studio Memoribox';

-- ============================================================================
-- JADWAL <-> ACARA <-> KAS <-> ANTREAN <-> SESI
-- Satu acara = satu baris `financial_events`. Jadwal (`booked_dates`) menaut ke acara lewat `event_id`.
-- Membuat jadwal otomatis membuat acara (muncul di Kas, Antrean, Sesi); membuat acara dari modul mana pun
-- otomatis mengunci tanggalnya di Jadwal. Nama & tanggal tersinkron dua arah.
-- Pemasukan acara & bagi hasil dihitung dari sesi lewat recalc_event_finance:
--   voucher x harga voucher + non-voucher x harga non-voucher + cetak x harga cetak,
--   bagi hasil = jumlah sesi voucher x share_per_voucher (atau persentase pada mode persentase).
-- ============================================================================
alter table public.booked_dates
  add column if not exists event_id bigint references public.financial_events(id) on delete cascade;
create unique index if not exists idx_booked_dates_event on public.booked_dates(event_id) where event_id is not null;

-- Token tiap peran dibuat otomatis dan berbeda: tamu antrean, kru antrean, sesi pelanggan, kru sesi.
create or replace function public.fill_event_tokens()
returns trigger
language plpgsql
as $$
begin
  new.queue_token      := coalesce(nullif(new.queue_token, ''),      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.queue_crew_token := coalesce(nullif(new.queue_crew_token, ''), substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.share_token      := coalesce(nullif(new.share_token, ''),      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.crew_token       := coalesce(nullif(new.crew_token, ''),       substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  return new;
end $$;

drop trigger if exists trg_fill_event_tokens on public.financial_events;
create trigger trg_fill_event_tokens before insert on public.financial_events
  for each row execute function public.fill_event_tokens();

-- Acara baru (dari Kas/Antrean/Sesi) -> kunci tanggal di Jadwal; ubah nama/tanggal acara -> perbarui Jadwal.
create or replace function public.sync_event_to_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('memoribox.skip_sync', true), '') = '1' then return new; end if;
  perform set_config('memoribox.skip_sync', '1', true);

  if tg_op = 'INSERT' then
    if not exists (select 1 from public.booked_dates where event_id = new.id) then
      insert into public.booked_dates (date, event_name, event_id) values (new.date, new.name, new.id);
    end if;
  else
    update public.booked_dates
       set date = new.date, event_name = new.name
     where event_id = new.id and (date is distinct from new.date or event_name is distinct from new.name);
  end if;

  perform set_config('memoribox.skip_sync', '0', true);
  return new;
end $$;

drop trigger if exists trg_event_to_schedule on public.financial_events;
create trigger trg_event_to_schedule after insert or update of name, date on public.financial_events
  for each row execute function public.sync_event_to_schedule();

-- Jadwal baru -> buat acara terkait; ubah jadwal -> perbarui acara.
create or replace function public.sync_schedule_to_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if coalesce(current_setting('memoribox.skip_sync', true), '') = '1' then return new; end if;
  perform set_config('memoribox.skip_sync', '1', true);

  if tg_op = 'INSERT' then
    if new.event_id is null then
      insert into public.financial_events (name, date) values (new.event_name, new.date) returning id into v_id;
      update public.booked_dates set event_id = v_id where id = new.id;
    end if;
  elsif new.event_id is not null then
    update public.financial_events
       set name = new.event_name, date = new.date
     where id = new.event_id and (name is distinct from new.event_name or date is distinct from new.date);
  end if;

  perform set_config('memoribox.skip_sync', '0', true);
  return new;
end $$;

drop trigger if exists trg_schedule_to_event on public.booked_dates;
create trigger trg_schedule_to_event after insert or update of event_name, date on public.booked_dates
  for each row execute function public.sync_schedule_to_event();

-- Jadwal dibatalkan -> acara ikut dihapus HANYA bila belum punya sesi, pemasukan, transaksi, atau antrean.
create or replace function public.cleanup_empty_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.event_id is null then return old; end if;
  if exists (
    select 1 from public.financial_events e
     where e.id = old.event_id
       and e.sessions = '[]'::jsonb
       and coalesce(e.income, 0) = 0
       and not exists (select 1 from public.transactions t where t.event_id = e.id)
       and not exists (select 1 from public.event_queues q where q.event_id = e.id)
  ) then
    perform set_config('memoribox.skip_sync', '1', true);
    delete from public.financial_events where id = old.event_id;
    perform set_config('memoribox.skip_sync', '0', true);
  end if;
  return old;
end $$;

drop trigger if exists trg_schedule_cleanup on public.booked_dates;
create trigger trg_schedule_cleanup after delete on public.booked_dates
  for each row execute function public.cleanup_empty_event();

-- Penyelarasan data yang sudah ada (aman dijalankan berulang).
update public.financial_events set
  queue_token      = coalesce(nullif(queue_token, ''),      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  queue_crew_token = coalesce(nullif(queue_crew_token, ''), substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  share_token      = coalesce(nullif(share_token, ''),      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  crew_token       = coalesce(nullif(crew_token, ''),       substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where queue_token is null or queue_crew_token is null or share_token is null or crew_token is null
   or queue_token = '' or queue_crew_token = '' or share_token = '' or crew_token = '';

do $$
declare
  r record;
  v_id bigint;
begin
  perform set_config('memoribox.skip_sync', '1', true);

  -- Tautkan jadwal dan acara yang sudah sama (tanggal + nama).
  update public.booked_dates b
     set event_id = e.id
    from public.financial_events e
   where b.event_id is null and b.date = e.date and b.event_name = e.name
     and not exists (select 1 from public.booked_dates x where x.event_id = e.id);

  -- Jadwal tanpa acara -> buat acaranya.
  for r in select id, date, event_name from public.booked_dates where event_id is null loop
    insert into public.financial_events (name, date) values (r.event_name, r.date) returning id into v_id;
    update public.booked_dates set event_id = v_id where id = r.id;
  end loop;

  -- Acara tanpa jadwal -> kunci tanggalnya.
  insert into public.booked_dates (date, event_name, event_id)
  select e.date, e.name, e.id from public.financial_events e
   where not exists (select 1 from public.booked_dates b where b.event_id = e.id);

  perform set_config('memoribox.skip_sync', '0', true);
end $$;

-- ============================================================================
-- Slug cantik untuk tautan antrean tamu/TV/QR (mis. /wedding-rajistha/display), tanpa token di URL.
-- Aman dijalankan berulang. Tautan lama 'nama-<token>' tetap berfungsi.
-- Tautan KRU tetap memakai token (rahasia); hanya tamu/TV/QR yang memakai slug.
-- ============================================================================
alter table public.financial_events add column if not exists queue_slug text;
create unique index if not exists idx_financial_events_queue_slug on public.financial_events(queue_slug) where queue_slug is not null;

create or replace function public.make_queue_slug(p_name text, p_id bigint default null)
returns text
language plpgsql
as $$
declare
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  v_base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
  v_base := trim(both '-' from left(v_base, 40));
  if v_base = '' then v_base := 'acara'; end if;
  v_slug := v_base;
  while exists (select 1 from public.financial_events where queue_slug = v_slug and id is distinct from p_id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end $$;

create or replace function public.queue_event_id(p_token text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  -- Menerima slug cantik ('wedding-rajistha'), atau tautan lama 'nama-<token>' / token murni (>= 8 karakter).
  select id from public.financial_events
  where p_token is not null and (
    queue_slug = p_token
    or (length(substring(p_token from '[^-]+$')) >= 8 and queue_token = substring(p_token from '[^-]+$'))
  )
  limit 1;
$$;

create or replace function public.fill_event_tokens()
returns trigger
language plpgsql
as $$
begin
  new.queue_token      := coalesce(nullif(new.queue_token, ''),      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.queue_crew_token := coalesce(nullif(new.queue_crew_token, ''), substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.share_token      := coalesce(nullif(new.share_token, ''),      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.crew_token       := coalesce(nullif(new.crew_token, ''),       substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  new.queue_slug       := coalesce(nullif(new.queue_slug, ''),       public.make_queue_slug(new.name, new.id));
  return new;
end $$;

-- Isi slug untuk acara yang sudah ada (satu per satu agar bentrok nama tertangani).
do $$
declare
  r record;
begin
  for r in select id, name from public.financial_events where queue_slug is null or queue_slug = '' order by id loop
    update public.financial_events set queue_slug = public.make_queue_slug(r.name, r.id) where id = r.id;
  end loop;
end $$;

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
      'queue_token', e.queue_token, 'queue_crew_token', e.queue_crew_token, 'queue_slug', e.queue_slug,
      'share_token', e.share_token, 'crew_token', e.crew_token, 'queue_open', e.queue_open
    ) order by e.date desc)
    from public.financial_events e
  ), '[]'::jsonb);
end $$;

grant execute on function public.queue_event_id(text) to anon, authenticated;
revoke execute on function public.admin_event_list() from public, anon;
grant execute on function public.admin_event_list() to authenticated;

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
  -- Slug cantik (sama dengan slug antrean), atau tautan lama 'nama-<token>' / token murni (>= 8 karakter).
  where p_token is not null and (
    e.queue_slug = p_token
    or (length(substring(p_token from '[^-]+$')) >= 8 and e.share_token = substring(p_token from '[^-]+$'))
  )
  limit 1;
$$;

grant execute on function public.get_live_event(text) to anon, authenticated;

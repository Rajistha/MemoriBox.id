-- ============================================================================
-- Performa panel admin: acara ringkas untuk Dashboard & Keuangan + indeks unik nomor antrean.
-- Aman dijalankan berulang.
-- ============================================================================

-- Acara ringkas untuk Dashboard/Keuangan: seluruh kolom kecuali sesi penuh & catatan; sesi hanya memuat
-- voucher/print (yang dibutuhkan untuk menghitung total), sehingga payload jauh lebih kecil.
create or replace function public.admin_events_compact()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;
  return coalesce((
    select jsonb_agg(
      (to_jsonb(e) - 'sessions' - 'session_notes') || jsonb_build_object('sessions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'no_voucher', coalesce((x->>'no_voucher')::boolean, false),
          'prints', coalesce((x->>'prints')::int, 0)))
        from jsonb_array_elements(e.sessions) x), '[]'::jsonb))
      order by e.date desc)
    from public.financial_events e
  ), '[]'::jsonb);
end $$;

revoke execute on function public.admin_events_compact() from public, anon;
grant execute on function public.admin_events_compact() to authenticated;

-- Nomor antrean unik per acara. Dilewati (dengan peringatan) bila data lama sudah punya duplikat.
do $$
begin
  if exists (select 1 from public.event_queues group by event_id, seq_number having count(*) > 1) then
    raise notice 'Indeks unik antrean dilewati: ada seq_number ganda. Bersihkan duplikat lalu jalankan ulang.';
  else
    create unique index if not exists idx_event_queues_event_seq_uniq on public.event_queues(event_id, seq_number);
  end if;
end $$;

-- ============================================================================
-- MEMBERSIHKAN DATA SEED / DATA CONTOH
-- Jalankan di Supabase SQL Editor. Skrip ini MENGHAPUS data operasional di bawah ini
-- (acara, transaksi, antrean, jadwal, ulasan, shortlink, dokumen, dan target/biaya tersimpan).
-- Galeri, logo klien, pricelist, tautan bio, profil, dan lokasi offline TIDAK disentuh.
-- ============================================================================

-- 1. PRATINJAU: jumlah baris yang akan dihapus (jalankan bagian ini dulu untuk memeriksa).
select 'financial_events' as tabel, count(*) as baris from public.financial_events
union all select 'transactions', count(*) from public.transactions
union all select 'event_queues', count(*) from public.event_queues
union all select 'live_sessions', count(*) from public.live_sessions
union all select 'booked_dates', count(*) from public.booked_dates
union all select 'reviews', count(*) from public.reviews
union all select 'short_links', count(*) from public.short_links
union all select 'documents', count(*) from public.documents
union all select 'settings (target/biaya)', count(*) from public.settings
  where key in ('target_all_time', 'custom_targets', 'operational_expenses', 'bio_links') or key like 'target_keuntungan_%';

-- 2. PENGHAPUSAN (satu transaksi: bila ada galat, tidak ada yang terhapus).
begin;

delete from public.event_queues;
delete from public.transactions;
delete from public.live_sessions;
delete from public.financial_events;
delete from public.booked_dates;
delete from public.reviews;
delete from public.short_links;
delete from public.documents;

delete from public.settings
 where key in ('target_all_time', 'custom_targets', 'operational_expenses', 'bio_links')
    or key like 'target_keuntungan_%';

commit;

-- Opsional: hapus juga galeri atau logo klien contoh (hapus tanda komentar bila diperlukan).
-- delete from public.gallery_images;
-- delete from public.client_logos;

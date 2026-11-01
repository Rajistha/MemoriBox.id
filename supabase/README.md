# Panduan Pengaturan Database Supabase Memoribox

Dokumen ini menjelaskan struktur basis data dan cara menerapkan skema database Supabase untuk operasional photobooth Memoribox.

---

## 1. Berkas Database

1. [supabase/schema.sql](file:///d:/3.%20portofolio%20web/Memoribox/supabase/schema.sql)
   - Tabel lengkap: `financial_events`, `transactions`, `booked_dates`, `settings`, `packages`, `gallery_images`, `client_logos`, `reviews`, `event_queues`, `live_sessions`, `short_links`, `documents`.
   - Fungsi RPC atomik PostgreSQL (`take_queue_ticket`, `get_queue_state`, `crew_queue_*`).
   - Kebijakan keamanan Row Level Security (RLS) untuk `anon` dan `authenticated`.
   - Konfigurasi bucket penyimpanan (`gallery`, `logos`, `pricelist`, `avatars`).

2. [supabase/seed.sql](file:///d:/3.%20portofolio%20web/Memoribox/supabase/seed.sql)
   - Data awal photobooth studio: paket sewa 2 jam & 3 jam, jadwal booked di kalender, ulasan pelanggan bintang 5, logo klien ternama, dan contoh invoice resmi.

---

## 2. Cara Menjalankan di Supabase Dashboard

1. Buka dashboard proyek Supabase Anda di browser (`https://supabase.com/dashboard`).
2. Masuk ke menu **SQL Editor** pada navigasi sisi kiri.
3. Klik tombol **New Query**.
4. Salin seluruh isi berkas [supabase/schema.sql](file:///d:/3.%20portofolio%20web/Memoribox/supabase/schema.sql), tempelkan ke editor, lalu tekan tombol **Run**.
5. Buka query baru, salin isi berkas [supabase/seed.sql](file:///d:/3.%20portofolio%20web/Memoribox/supabase/seed.sql), lalu tekan tombol **Run**.
6. Selesai! Seluruh tabel, fungsi antrian, storage bucket, dan data awal kini telah siap digunakan.

---

## 3. Konfigurasi Lingkungan (`.env.local`)

Pastikan berkas `.env.local` memiliki kredensial proyek Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
NEXT_PUBLIC_ROOT_DOMAIN=memoribox.id
```

-- ============================================================================
-- MEMORIBOX PHOTOBOOTH & STUDIO OPERATIONS
-- Berkas ini TIDAK lagi berisi data contoh. Seluruh data (acara, transaksi, galeri, ulasan,
-- logo, jadwal, dokumen) diisi langsung dari panel admin. Hanya penyelarasan kolom yang tersisa.
-- Jalankan di SQL Editor Supabase setelah schema.sql (aman dijalankan berulang).
-- ============================================================================

-- Pastikan kolom MoU event dan antrian tersedia di database sebelum seeding
alter table public.financial_events
  add column if not exists queue_token text unique,
  add column if not exists queue_crew_token text unique,
  add column if not exists pricing_mode text not null default 'voucher',
  add column if not exists session_price integer not null default 45000,
  add column if not exists share_percent numeric(5,2) not null default 15,
  add column if not exists voucher_price integer not null default 30000,
  add column if not exists no_voucher_price integer not null default 35000,
  add column if not exists print_price integer not null default 10000,
  add column if not exists share_per_voucher integer not null default 0,
  add column if not exists share_token text unique,
  add column if not exists crew_token text unique,
  add column if not exists sessions jsonb not null default '[]'::jsonb,
  add column if not exists session_notes text not null default '',
  add column if not exists income_adjustment numeric not null default 0;

alter table public.event_queues
  add column if not exists event_id bigint references public.financial_events(id) on delete cascade,
  add column if not exists event_slug text default '',
  add column if not exists queue_number text,
  add column if not exists seq_number integer,
  add column if not exists customer_name text not null default '',
  add column if not exists customer_phone text not null default '',
  add column if not exists status text not null default 'waiting',
  add column if not exists wa_notified boolean not null default false,
  add column if not exists called_count integer not null default 0,
  add column if not exists prints integer not null default 0,
  add column if not exists no_voucher boolean not null default false,
  add column if not exists called_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RESERVED = new Set([
  'admin',
  'queue',
  'short',
  'links',
  'bio',
  'sesi',
  'pricelist',
  'paket',
  'jadwal',
  'galeri',
  'login',
  'api',
  'sites',
  'display',
  'qr',
  'crew',
]);

export default async function ShortRedirect({ params }) {
  const { slug } = await params;

  if (RESERVED.has(slug)) {
    notFound();
  }

  // Catat klik dan ambil tujuan lewat RPC atomik. redirect() dipanggil di luar try/catch
  // karena redirect bekerja dengan melempar galat khusus yang tidak boleh tertangkap.
  let destination = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc('track_short_click', { p_slug: slug });
    destination = data || null;
  } catch (err) {
    console.warn('Shortlink lookup error:', err?.message);
  }

  if (destination) redirect(destination);
  notFound();
}

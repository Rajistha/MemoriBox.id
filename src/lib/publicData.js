import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PACKAGES, mergePackages } from '@/lib/pricelistDefaults';
import { OFFLINE_KEY, normalizeLocations } from '@/lib/offlineLocations';
import { DEFAULT_LINKTREE_PROFILE, DEFAULT_LINKS } from '@/lib/linktreeDefaults';
import { SITE_PROFILE_KEY, DEFAULT_PROFILE, normalizeProfile } from '@/lib/siteProfile';

// Loader data publik untuk landing page (Server Component, kunci anon, tanpa cookie agar bisa di-ISR).
// Semua tabel dibaca apa adanya: bila kosong atau galat, landing menyembunyikan bagian tersebut (tanpa data contoh).
const getClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

const safe = async (promise, fallback) => {
  try {
    const { data, error } = await promise;
    if (error) throw error;
    return data ?? fallback;
  } catch (err) {
    console.warn('[publicData]', err?.message || err);
    return fallback;
  }
};

// next/image hanya boleh memuat host yang diizinkan di next.config.mjs; URL lain disaring agar halaman tidak error.
const isAllowedImage = (u) => {
  if (!u || typeof u !== 'string') return false;
  if (u.startsWith('/')) return true;
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === 'https:' && (hostname.endsWith('.supabase.co') || hostname === 'images.unsplash.com');
  } catch {
    return false;
  }
};

// Tanggal "hari ini" menurut Jakarta (server berjalan di UTC; tanpa ini jadwal hari ini bisa hilang sebelum pukul 07.00 WIB).
const todayJakarta = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

const pickSetting = (rows, key) => rows.find((r) => r.key === key)?.value ?? null;

// Satu query `settings` per permintaan, dipakai bersama oleh SiteShell, halaman, dan loader lain (cache React).
const getSettingsRows = cache(async () => {
  const sb = getClient();
  if (!sb) return [];
  return safe(sb.from('settings').select('key,value').in('key', ['pricelist', OFFLINE_KEY, SITE_PROFILE_KEY]), []);
});

/** Profil bisnis (kontak, area, peta, rekening, FAQ, syarat) yang diatur dari admin. */
export async function getSiteProfile() {
  return normalizeProfile(pickSetting(await getSettingsRows(), SITE_PROFILE_KEY));
}

/** Paket layanan saja (dipakai halaman detail /paket/[id]). */
export async function getPackages() {
  const saved = pickSetting(await getSettingsRows(), 'pricelist');
  return saved?.packages ? mergePackages(saved.packages) : DEFAULT_PACKAGES;
}

const mapBooked = (booked) =>
  booked
    .map((b) => ({ id: b.id, date: b.date, name: b.event_name || 'Acara terjadwal' }))
    // Hindari baris ganda (tanggal + nama sama) pada daftar acara publik.
    .filter((e, i, arr) => arr.findIndex((x) => x.date === e.date && x.name === e.name) === i);

const fetchBooked = (sb) =>
  safe(
    sb.from('booked_dates').select('id,date,event_name').gte('date', todayJakarta()).order('date', { ascending: true }),
    []
  );

/** Hanya acara terjadwal (halaman /jadwal). */
export async function getBookedEvents() {
  const sb = getClient();
  return sb ? mapBooked(await fetchBooked(sb)) : [];
}

export async function getLandingData() {
  const sb = getClient();
  if (!sb) {
    return { packages: DEFAULT_PACKAGES, gallery: [], reviews: [], logos: [], bookedEvents: [], offline: [], profile: DEFAULT_PROFILE };
  }

  const [settings, gallery, reviews, logos, booked] = await Promise.all([
    getSettingsRows(),
    safe(sb.from('gallery_images').select('id,url,category,title,alt').order('created_at', { ascending: false }).limit(60), []),
    safe(sb.from('reviews').select('id,client_name,event_type,name,role,comment,rating').order('sort_order', { ascending: true }).order('created_at', { ascending: false }).limit(12), []),
    safe(sb.from('client_logos').select('id,client_name,logo_url').order('sort_order', { ascending: true }), []),
    fetchBooked(sb),
  ]);

  const pricelist = pickSetting(settings, 'pricelist');

  return {
    packages: pricelist?.packages ? mergePackages(pricelist.packages) : DEFAULT_PACKAGES,
    gallery: gallery.filter((g) => isAllowedImage(g.url)),
    reviews: reviews
      .map((r) => ({ id: r.id, name: r.client_name || r.name || '', role: r.event_type || r.role || '', comment: r.comment || '', rating: Number(r.rating) || 5 }))
      .filter((r) => r.comment),
    logos: logos.filter((l) => isAllowedImage(l.logo_url)),
    bookedEvents: mapBooked(booked),
    profile: normalizeProfile(pickSetting(settings, SITE_PROFILE_KEY)),
    offline: normalizeLocations(pickSetting(settings, OFFLINE_KEY)).filter((l) => l.active && isAllowedImage(l.image_url)),
  };
}

/** Profil + daftar tautan untuk link.memoribox.id (diatur dari menu Tautan di admin). */
export async function getLinktree() {
  const sb = getClient();
  const rows = sb ? await safe(sb.from('settings').select('key,value').eq('key', 'linktree'), []) : [];
  const value = pickSetting(rows, 'linktree');

  const profile = {
    ...DEFAULT_LINKTREE_PROFILE,
    ...(value?.profile || {}),
    concierge: { ...DEFAULT_LINKTREE_PROFILE.concierge, ...(value?.profile?.concierge || {}) },
  };
  if (!isAllowedImage(profile.avatarUrl)) profile.avatarUrl = '/logo.png';

  return { profile, links: Array.isArray(value?.links) ? value.links : DEFAULT_LINKS };
}

/** Seluruh foto galeri untuk halaman /galeri (hanya URL yang boleh dimuat next/image). */
export async function getGallery(limit = 300) {
  const sb = getClient();
  if (!sb) return [];
  const rows = await safe(
    sb.from('gallery_images').select('id,url,category,title,alt').order('created_at', { ascending: false }).limit(limit),
    []
  );
  return rows.filter((g) => isAllowedImage(g.url));
}

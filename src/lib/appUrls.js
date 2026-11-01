// Helper URL & formatting yang dipakai seluruh ranah Memoribox.
import { siteUrl, isLocalHost } from './domains';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const slugify = (text) =>
  (text || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const formatRp = (n) => {
  const num = Math.round(Number(n) || 0);
  const parts = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return num < 0 ? `-Rp ${parts}` : `Rp ${parts}`;
};

export const formatDate = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tanpa tanggal';

export const daysUntil = (date, todayStr) =>
  Math.round((new Date(`${date}T00:00:00`) - new Date(`${todayStr}T00:00:00`)) / 86400000);

export const todayString = () => new Date().toLocaleDateString('en-CA');

export const getAdminUrl = () => {
  if (typeof window === 'undefined') return '/admin';
  return window.location.hostname.includes('memoribox.id') ? siteUrl('app') : '/admin';
};

export const getBioUrl = () =>
  typeof window !== 'undefined' && isLocalHost()
    ? '/bio'
    : siteUrl('link');

// Setiap peran memakai token sendiri agar tamu tidak bisa membuka halaman kru:
//   antrean tamu/TV/QR = queue_token, kru antrean = queue_crew_token, sesi pelanggan = share_token, kru sesi = crew_token.
export const getEventSlug = (item, tokenKey) => {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();
  const token = (tokenKey && item[tokenKey]) || item.queue_token || item.share_token || item.crew_token || item.queue_crew_token || item.id;
  const name = slugify(item.name || 'acara');
  return token ? `${name}-${token}` : name;
};

export const queueBaseUrl = () => {
  if (typeof window === 'undefined') return siteUrl('queue');
  if (isLocalHost()) {
    return `${window.location.origin}/queue`;
  }
  return siteUrl('queue');
};

export const queueGuestUrl = (eventOrSlug) => {
  const slug = getEventSlug(eventOrSlug, 'queue_token');
  if (!slug) return '';
  if (typeof window !== 'undefined' && isLocalHost()) {
    return `/queue/${slug}`;
  }
  return siteUrl('queue', `/${slug}`);
};

export const queueDisplayUrl = (eventOrSlug) => {
  const slug = getEventSlug(eventOrSlug, 'queue_token');
  if (!slug) return '';
  if (typeof window !== 'undefined' && isLocalHost()) {
    return `/queue/${slug}/display`;
  }
  return siteUrl('queue', `/${slug}/display`);
};

export const queueQrUrl = (eventOrSlug) => {
  const slug = getEventSlug(eventOrSlug, 'queue_token');
  if (!slug) return '';
  if (typeof window !== 'undefined' && isLocalHost()) {
    return `/queue/${slug}/qr`;
  }
  return siteUrl('queue', `/${slug}/qr`);
};

export const getAppBaseUrl = () => {
  if (typeof window === 'undefined') return siteUrl('app');
  if (isLocalHost()) {
    return window.location.origin;
  }
  return siteUrl('app');
};

export const queueCrewUrl = (eventOrSlug) => {
  const slug = getEventSlug(eventOrSlug, 'queue_crew_token');
  if (!slug) return '';
  if (typeof window !== 'undefined' && isLocalHost()) {
    return `/queue/${slug}/crew`;
  }
  return siteUrl('queue', `/${slug}/crew`);
};

export const liveUrl = (eventOrSlug) => {
  const slug = getEventSlug(eventOrSlug, 'share_token');
  if (!slug) return '';
  if (typeof window !== 'undefined' && isLocalHost()) {
    return `/live/${slug}`;
  }
  return siteUrl('live', `/${slug}`);
};

export const crewUrl = (eventOrSlug) => {
  const slug = getEventSlug(eventOrSlug, 'crew_token');
  if (!slug) return '';
  if (typeof window !== 'undefined' && isLocalHost()) {
    return `/live/crew/${slug}`;
  }
  return siteUrl('live', `/crew/${slug}`);
};

export const tokenFromSlug = (slug) => (slug ? slug.split('-').pop() : '');

export const safeUrl = (url) => {
  const value = (url || '').trim();
  if (!value) return '#';
  if (value.startsWith('/') || value.startsWith('#')) return value;
  return /^(https?:|mailto:|tel:)/i.test(value) ? value : '#';
};

export const newToken = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);

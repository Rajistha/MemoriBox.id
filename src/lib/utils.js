/**
 * General purpose utilities for Memoribox platform.
 */

export function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  const num = Math.round(Number(amount));
  const parts = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return num < 0 ? `-Rp ${parts}` : `Rp ${parts}`;
}

export function formatNumberWithDots(val) {
  if (val === '' || val === null || val === undefined) return '0';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '0';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Tanggal lokal (bukan UTC) dalam format YYYY-MM-DD. toISOString() memakai UTC dan bergeser sehari di WIB.
export function toYmd(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayYmd = () => toYmd(new Date());

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '-';
  try {
    // 'YYYY-MM-DD' dibaca sebagai tanggal lokal agar tidak bergeser oleh zona waktu.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: opts.shortMonth ? 'short' : 'long',
      year: 'numeric',
      ...opts,
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function cleanPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function maskPhone(phone) {
  if (!phone) return '';
  const cleaned = cleanPhone(phone);
  if (cleaned.length < 8) return '****';
  return cleaned.slice(0, 4) + '****' + cleaned.slice(-4);
}

export function getInitials(name) {
  if (!name) return 'MB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function generateSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

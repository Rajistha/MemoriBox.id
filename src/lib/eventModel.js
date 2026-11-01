// Bentuk event (tabel financial_events) yang dipakai bersama oleh Jadwal, Kas, Antrean, dan Sesi.
// Satu acara = satu baris; token dibuat otomatis oleh database sehingga semua modul memakai acara yang sama.
export const formatEvent = (ev) => ({
  ...ev,
  pricing_mode: ev.pricing_mode || 'voucher',
  voucher_price: Number(ev.voucher_price) || 0,
  no_voucher_price: Number(ev.no_voucher_price) || 0,
  session_price: Number(ev.session_price) || 0,
  print_price: Number(ev.print_price) || 0,
  share_per_voucher: Number(ev.share_per_voucher) || 0,
  share_percent: Number(ev.share_percent) || 0,
  sessions: Array.isArray(ev.sessions) ? ev.sessions : [],
});

export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Harga & perhitungan pencatatan sesi foto (dipakai halaman Sesi Foto, Antrean, dan Keuangan Event Memoribox).
// Harga bawaan. Nilai yang sama dipakai sebagai default di database (recalc_event_finance & tabel financial_events);
// ubah keduanya bersamaan bila tarif standar berubah.
export const VOUCHER_PRICE = 30000;
export const NO_VOUCHER_PRICE = 35000;
export const PRINT_PRICE = 10000;
export const SESSION_PRICE = 45000;

// Penanda baris pengeluaran otomatis di tabel transactions.
export const SHARING_SOURCE = 'sharing_profit';
export const SHARING_DESCRIPTION = 'Sharing profit (otomatis)';

// Mode tarif event: 'voucher' (voucher/non-voucher, sharing Rp per voucher)
// atau 'percent' (satu tarif per sesi, sharing = persen dari pemasukan sesi).
export const isPercentMode = (event) =>
  event?.pricing_mode === 'percent' || event?.pricing_mode === 'percentage';

// Gabungkan tarif dari kolom event dengan override (mis. draft di modal). Override menang.
export const pricingOf = (event, custom = {}) => {
  const mode = custom?.mode ?? (isPercentMode(event) ? 'percent' : 'voucher');
  return {
    mode,
    voucherPrice: custom?.voucherPrice ?? (Number(event?.voucher_price) || VOUCHER_PRICE),
    noVoucherPrice: custom?.noVoucherPrice ?? (Number(event?.no_voucher_price) || NO_VOUCHER_PRICE),
    sessionPrice: custom?.sessionPrice ?? (Number(event?.session_price) || SESSION_PRICE),
    printPrice: custom?.printPrice ?? (Number(event?.print_price) || PRINT_PRICE),
    sharePercent: custom?.sharePercent ?? (Number(event?.share_percent) || 20),
    sharePerVoucher: custom?.sharePerVoucher ?? (Number(event?.share_per_voucher) || 10000),
  };
};

export const sessionPrice = (session, customPrices = {}) => {
  const p = pricingOf(null, customPrices);
  const base = p.mode === 'percent' ? p.sessionPrice : session.no_voucher ? p.noVoucherPrice : p.voucherPrice;
  return base + (Number(session.prints) || 0) * p.printPrice;
};

export const eventTotal = (event, customPrices = {}) => {
  const p = pricingOf(event, customPrices);
  const sessions = Array.isArray(event?.sessions) ? event.sessions : [];
  if (sessions.length === 0 && event?.income) {
    return Number(event.income) || 0;
  }
  return sessions.reduce((sum, s) => sum + sessionPrice(s, p), 0);
};

export const voucherCount = (event) =>
  (Array.isArray(event?.sessions) ? event.sessions : []).filter((s) => !s.no_voucher).length;

// Mode voucher: jumlah voucher * nominal per voucher. Mode persen: persentase dari pemasukan sesi.
export const eventSharing = (event, customPrices = {}) => {
  const p = pricingOf(event, customPrices);
  if (p.mode === 'percent') {
    return Math.round((eventTotal(event, p) * (Number(p.sharePercent) || 0)) / 100);
  }
  return voucherCount(event) * (Number(p.sharePerVoucher) || 0);
};

export const eventStudioNet = (event, customPrices = {}) =>
  eventTotal(event, customPrices) - eventSharing(event, customPrices);

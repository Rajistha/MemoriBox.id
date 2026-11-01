// Data harga bawaan resmi Memoribox Photobooth & Photobox.
// Nama paket, tagline, dan daftar harga bisa ditimpa dari dashboard admin (tabel site_settings, key 'pricelist').
export const DEFAULT_PACKAGES = [
  {
    id: 'softfile',
    label: 'Soft File Only',
    badge: null,
    tagline: 'Kenangan digital tanpa batas kualitas tinggi',
    extraNote: '',
    features: [
      'Free transport area Jabodetabek',
      'Camera + Professional Lighting + Monitor 24"',
      '2 Standby Crew Profesional',
      'Unlimited Shots (bisa retake)',
      'Soft File via QR Code instan + GIF Booth',
      'Aksesoris Fun Props & Kacamata Unik',
      'Free Custom Frame Design (maks. 2 revisi)',
    ],
    prices: [
      { label: '3 Jam', price: 999000 },
      { label: '4 Jam', price: 1199000 },
      { label: '5 Jam', price: 1399000 },
      { label: '6 Jam', price: 1595000 },
      { label: '7 Jam', price: 1850000 },
      { label: '8 Jam', price: 2050000 },
      { label: '9 Jam', price: 2250000 },
      { label: '10 Jam', price: 2499000 },
    ],
  },
  {
    id: 'limited',
    label: 'Limited Print',
    badge: null,
    tagline: 'Cetak presisi sesuai target kebutuhan tamu acara',
    extraNote: 'Tambah waktu (tanpa cetak tambahan): Rp 500.000 / jam',
    features: [
      'Free transport area Jabodetabek',
      'Camera + Professional Lighting + Monitor 24"',
      '2 Standby Crew Profesional',
      'Unlimited Shots (bisa retake)',
      'Soft File via QR Code instan + GIF Booth',
      'Aksesoris Fun Props & Kacamata Unik',
      'Free Custom Frame Design (maks. 2 revisi)',
      'Highspeed Lab Printer (Cetak 10-15 detik)',
      'Kertas Foto Premium Anti-Pudar (Ukuran 2R Strip / 4R)',
    ],
    prices: [
      { label: '100 Prints', sub: 'maks. 4 jam', price: 1800000 },
      { label: '200 Prints', sub: 'maks. 5 jam', price: 2100000 },
      { label: '300 Prints', sub: 'maks. 6 jam', price: 2500000 },
      { label: '400 Prints', sub: 'maks. 7 jam', price: 2900000 },
      { label: '500 Prints', sub: 'maks. 8 jam', price: 3400000 },
      { label: '600 Prints', sub: 'maks. 8 jam', price: 4000000 },
      { label: '700 Prints', sub: 'maks. 8 jam', price: 4600000 },
      { label: '800 Prints', sub: 'maks. 9 jam', price: 5400000 },
      { label: '900 Prints', sub: 'maks. 10 jam', price: 6200000 },
    ],
  },
  {
    id: 'unlimited',
    label: 'Unlimited Print',
    badge: 'Paling Populer',
    tagline: 'Cetak foto sepuasnya tanpa batas kuota selama acara',
    extraNote: '',
    features: [
      'Free transport area Jabodetabek',
      'Camera + Professional Lighting + Monitor 24"',
      '2 Standby Crew Profesional',
      'Unlimited Shots (bisa retake)',
      'Soft File via QR Code instan + GIF Booth',
      'Aksesoris Fun Props & Kacamata Unik',
      'Free Custom Frame Design (maks. 2 revisi)',
      'Highspeed Lab Printer (Cetak 10-15 detik)',
      'Kertas Foto Premium Anti-Pudar (Ukuran 2R Strip / 4R)',
    ],
    prices: [
      { label: '2 Jam', price: 2400000 },
      { label: '3 Jam', price: 2900000 },
      { label: '4 Jam', price: 3400000 },
      { label: '5 Jam', price: 3900000 },
      { label: '6 Jam', price: 4400000 },
      { label: '7 Jam', price: 4850000 },
      { label: '8 Jam', price: 5350000 },
      { label: '9 Jam', price: 5850000 },
      { label: '10 Jam', price: 6350000 },
    ],
  },
];

export const formatRupiah = (n) => {
  const num = Math.round(Number(n) || 0);
  const parts = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return num < 0 ? `-Rp ${parts}` : `Rp ${parts}`;
};

// Gabungkan data tersimpan (label, tagline, prices) ke default berdasarkan id paket.
export const mergePackages = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_PACKAGES;
  return DEFAULT_PACKAGES.map((def) => {
    const s = saved.find((p) => p.id === def.id);
    if (!s) return def;
    return {
      ...def,
      label: s.label || def.label,
      badge: s.badge !== undefined ? s.badge : def.badge,
      features: Array.isArray(s.features) && s.features.length > 0 ? s.features : def.features,
      extraNote: s.extraNote !== undefined ? s.extraNote : (def.extraNote || ''),
      tagline: s.tagline ?? def.tagline,
      prices: Array.isArray(s.prices) && s.prices.length > 0 ? s.prices : def.prices,
    };
  });
};

export const startFrom = (pkg) =>
  pkg.prices.length > 0 ? Math.min(...pkg.prices.map((p) => Number(p.price) || 0)) : 0;

export const DEFAULT_TNC = [
  'Penyewa WAJIB membayarkan Down Payment (DP) 30% untuk mengamankan tanggal acara.',
  'Pelunasan pembayaran dilakukan paling lambat H-1 sebelum tanggal acara berlangsung.',
  'Konfirmasi perubahan tanggal acara maksimal dilakukan H-7 sebelum acara (tergantung ketersediaan booth).',
  'Jika terjadi pembatalan pemesanan sepihak oleh penyewa, uang DP dinyatakan hangus.',
  'Pembayaran resmi melalui Bank Transfer (Bank Jago / BCA / Mandiri) atau QRIS Resmi Memoribox.',
  'Penyewa wajib mengisi Format Pemesanan dan menerima tanda terima Quotation/Invoice resmi.',
  'Tim teknisi & kru Memoribox tiba di lokasi acara 1-2 jam sebelum acara dimulai untuk setup dan tes foto.',
  'Penyedia acara menyediakan daya listrik minimal 500-900 Watt dan area booth terlindung dari cuaca langsung.',
];

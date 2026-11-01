// Profil bisnis MemoriBox yang diatur dari admin (menu Profil). Disimpan di tabel `settings`, key 'site_profile'.
// Kolom yang kosong tidak ditampilkan di situs; tidak ada nomor, alamat, atau rekening bawaan.
export const SITE_PROFILE_KEY = 'site_profile';

export const DEFAULT_FAQS = [
  {
    q: 'Bagaimana cara kerja antrean digital?',
    a: 'Tamu memindai QR di area booth untuk mendapatkan nomor tiket, lalu bebas menikmati acara. Saat giliran tiba, nomor dipanggil lewat layar TV dan bunyi panggilan.',
  },
  {
    q: 'Apakah desain frame bisa disesuaikan dengan tema acara?',
    a: 'Bisa. Frame dibuat dengan logo, nama acara, dan warna tema Anda, lengkap dengan pratinjau dan revisi sebelum hari acara.',
  },
  {
    q: 'Kapan foto digital bisa diunduh?',
    a: 'Langsung saat acara berlangsung, lewat QR atau tautan album online yang dibagikan.',
  },
  {
    q: 'Bagaimana prosedur pemesanan dan pembayaran?',
    a: 'Cek tanggal pada kalender, lalu hubungi kami lewat WhatsApp. DP mengunci tanggal, pelunasan dilakukan sebelum acara.',
  },
];

export const DEFAULT_SERVICES = [
  { icon: 'camera', title: 'Kamera & pencahayaan', desc: 'Foto tajam dengan monitor 24 inci dan pencahayaan yang dikalibrasi di lokasi.' },
  { icon: 'printer', title: 'Cetak di lokasi', desc: 'Printer cepat dengan kertas foto premium, ukuran strip 2R atau 4R.' },
  { icon: 'phone', title: 'Foto digital via QR', desc: 'Tamu dan panitia mengunduh foto dari ponsel, tanpa menunggu setelah acara.' },
  { icon: 'users', title: 'Antrean digital', desc: 'Tamu ambil nomor lewat QR dan dipanggil di layar TV, tanpa berdesakan.' },
  { icon: 'layout', title: 'Frame kustom', desc: 'Desain frame sesuai tema, logo, atau nama acara Anda, termasuk revisi.' },
  { icon: 'clock', title: 'Setup tepat waktu', desc: 'Kru tiba 1–2 jam lebih awal untuk pemasangan dan uji pencahayaan.' },
];

export const DEFAULT_PROFILE = {
  name: 'MemoriBox',
  base: 'Jakarta',
  area: 'Jabodetabek & Bali',
  address: 'DKI Jakarta, Indonesia',
  whatsapp: '',
  phoneDisplay: '',
  email: '',
  instagram: '',
  tiktok: '',
  mapQuery: 'DKI Jakarta, Indonesia',
  highlights: ['Cetak instan di lokasi', 'Foto digital via QR', 'Kru berpengalaman'],
  heroMosaic: false,
  bank: { bankName: '', accountNumber: '', accountHolder: '', qrisNote: '' },
  terms: [],
  faqs: DEFAULT_FAQS,
  services: DEFAULT_SERVICES,
};

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

export const normalizeProfile = (value) => {
  const v = value && typeof value === 'object' ? value : {};
  const faqs = Array.isArray(v.faqs)
    ? v.faqs.map((f) => ({ q: str(f?.q), a: str(f?.a) })).filter((f) => f.q && f.a)
    : null;
  const services = Array.isArray(v.services)
    ? v.services.map((x) => ({ icon: str(x?.icon) || 'star', title: str(x?.title), desc: str(x?.desc) })).filter((x) => x.title)
    : null;
  return {
    name: str(v.name) || DEFAULT_PROFILE.name,
    base: typeof v.base === 'string' ? v.base.trim() : DEFAULT_PROFILE.base,
    area: typeof v.area === 'string' ? v.area.trim() : DEFAULT_PROFILE.area,
    address: typeof v.address === 'string' ? v.address.trim() : DEFAULT_PROFILE.address,
    whatsapp: str(v.whatsapp).replace(/\D/g, ''),
    phoneDisplay: str(v.phoneDisplay),
    email: str(v.email),
    instagram: str(v.instagram).replace(/^@/, ''),
    tiktok: str(v.tiktok).replace(/^@/, ''),
    mapQuery: typeof v.mapQuery === 'string' ? v.mapQuery.trim() : DEFAULT_PROFILE.mapQuery,
    heroMosaic: v.heroMosaic === true,
    highlights: Array.isArray(v.highlights) ? strList(v.highlights) : DEFAULT_PROFILE.highlights,
    bank: { ...DEFAULT_PROFILE.bank, ...(v.bank && typeof v.bank === 'object' ? v.bank : {}) },
    terms: strList(v.terms),
    faqs: faqs ?? DEFAULT_FAQS,
    services: services ?? DEFAULT_SERVICES,
  };
};

// Nomor lokal (08...) -> format internasional (62...).
export const toWaNumber = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.startsWith('0') ? `62${d.slice(1)}` : d;
};

export const waUrl = (profile, text) =>
  profile?.whatsapp ? `https://wa.me/${toWaNumber(profile.whatsapp)}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '';

export const mapEmbedUrl = (profile) => {
  const q = profile?.mapQuery || profile?.base || '';
  return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=12&output=embed` : '';
};

// Satu baris area layanan, mis. "Basecamp Jakarta · melayani Jabodetabek & Bali".
export const serviceLine = (profile) =>
  [profile?.base && `Basecamp ${profile.base}`, profile?.area && `melayani ${profile.area}`].filter(Boolean).join(' · ');

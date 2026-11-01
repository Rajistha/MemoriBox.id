/**
 * Default rich mock data store for Memoribox platform.
 * Provides fallback data for SSR/ISR and local previews.
 */

export const DEFAULT_PACKAGES = [
  {
    id: 'pkg-softfile',
    name: 'Softfile Only',
    slug: 'softfile-only',
    tier: 'softfile',
    price: 750000,
    durationHours: 2,
    badge: 'Ekonomis',
    description: 'Solusi praktis dan hemat untuk acara intim. Semua tamu mendapatkan hasil foto digital beresolusi tinggi.',
    features: [
      'Durasi sewa booth 2 jam',
      'Unlimited sesi foto selama durasi',
      'Download instan via Google Drive & Live Session',
      'Smart Queue QR: tamu antre via smartphone',
      'Template frame digital kustom dengan logo acara',
      'Properti / props foto standar',
      '1 Orang operator teknis ramah',
    ],
  },
  {
    id: 'pkg-limited',
    name: 'Limited Print',
    slug: 'limited-print',
    tier: 'limited',
    price: 1500000,
    durationHours: 3,
    badge: 'Paling Populer',
    isBestSeller: true,
    description: 'Pilihan favorit untuk resepsi pernikahan dan pesta ulang tahun dengan cetak foto fisik berkualitas studio.',
    features: [
      'Durasi sewa booth 3 jam',
      'Kapasitas cetak hingga 100 lembar (2 strip per sesi)',
      'Kertas foto premium anti-luntur & anti-air',
      'Smart Queue System dengan audio bel panggung',
      'Custom desain cetak (2x6 strip atau 4x6 inch)',
      'Koleksi props premium & fun aksesoris',
      'Seluruh softfile digital via Google Drive',
      '2 Kru operator siap melayani tamu',
    ],
  },
  {
    id: 'pkg-unlimited',
    name: 'Unlimited Print',
    slug: 'unlimited-print',
    tier: 'unlimited',
    price: 2500000,
    durationHours: 4,
    badge: 'VIP & Corporate',
    description: 'Pengalaman photobooth tanpa batas untuk acara besar. Setiap tamu yang berfoto mendapatkan hasil cetak.',
    features: [
      'Durasi sewa booth 4 jam (bisa diperpanjang)',
      'Unlimited print sepuasnya tanpa batas kuota',
      'Fast high-speed thermal printing (12 detik per print)',
      'Smart Queue TV Display + audio chime panggung',
      'Free 1 Guestbook album kenangan eksklusif',
      'Custom backdrop kain / sequin premium',
      'QR download instan langsung di layar cetak',
      '2 Crew profesional & standby teknisi',
    ],
  },
];

export const DEFAULT_GALLERY = [
  {
    id: 'gal-1',
    title: 'The Wedding of Cindy & Arya',
    category: 'Wedding',
    imageUrl: '/1.webp',
    date: '2026-10-15',
    rating: 5,
  },
  {
    id: 'gal-2',
    title: 'Bank Mandiri Corporate Gala Dinner',
    category: 'Corporate',
    imageUrl: '/2.webp',
    date: '2026-09-28',
    rating: 5,
  },
  {
    id: 'gal-3',
    title: 'Sweet 17th Birthday of Jessica',
    category: 'Birthday',
    imageUrl: '/3.webp',
    date: '2026-10-02',
    rating: 5,
  },
  {
    id: 'gal-4',
    title: 'Wisuda Universitas Indonesia XLVIII',
    category: 'Graduation',
    imageUrl: '/4.webp',
    date: '2026-09-12',
    rating: 5,
  },
  {
    id: 'gal-5',
    title: 'Wedding of Nabila & Reza',
    category: 'Wedding',
    imageUrl: '/5.webp',
    date: '2026-08-20',
    rating: 5,
  },
  {
    id: 'gal-6',
    title: 'Tech Fest 2026 Exhibition Booth',
    category: 'Corporate',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    date: '2026-08-05',
    rating: 5,
  },
];

export const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    customerName: 'Cindy Paramitha & Arya',
    eventType: 'Wedding Reception',
    rating: 5,
    reviewText:
      'Memoribox benar-benar mengubah suasana resepsi kami! Tamu-tamu sangat puas karena antreannya teratur lewat QR di HP dan ada lonceng panggilannya di layar TV. Kualitas cetaknya super tajam!',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isVerified: true,
  },
  {
    id: 'rev-2',
    customerName: 'Budi Santoso',
    eventType: 'Corporate Event — PT Adhi Karya',
    rating: 5,
    reviewText:
      'Administrasinya sangat cepat dan profesional. Quotation dan Invoice resmi dengan stempel Memoribox langsung terbit dalam hitungan detik. Live photo countdown juga sangat disukai klien korporat.',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    isVerified: true,
  },
  {
    id: 'rev-3',
    customerName: 'Kezia Angeline',
    eventType: 'Sweet 17th Party',
    rating: 5,
    reviewText:
      'Photobooth paling seru! Template frame-nya didesain kustom sesuai tema warna gaun saya, dan kru Memoribox super sabar mengarahkan gaya teman-teman yang foto. Highly recommended!',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    isVerified: true,
  },
];

export const DEFAULT_CLIENT_LOGOS = [
  { id: 'logo-1', clientName: 'Bank Mandiri', logoUrl: '/logo.png' },
  { id: 'logo-2', clientName: 'Telkomsel', logoUrl: '/logo.png' },
  { id: 'logo-3', clientName: 'Tokopedia', logoUrl: '/logo.png' },
  { id: 'logo-4', clientName: 'Astra International', logoUrl: '/logo.png' },
  { id: 'logo-5', clientName: 'Universitas Indonesia', logoUrl: '/logo.png' },
];

export const DEFAULT_BOOKED_DATES = [
  '2026-11-07',
  '2026-11-14',
  '2026-11-15',
  '2026-11-21',
  '2026-11-28',
  '2026-12-05',
  '2026-12-12',
  '2026-12-25',
];

export const initialBookedDates = [
  { id: 'b-1', date: '2026-11-07', eventName: 'Wedding Cindy & Arya' },
  { id: 'b-2', date: '2026-11-14', eventName: 'Corporate Gala Bank Mandiri' },
  { id: 'b-3', date: '2026-11-15', eventName: 'Wisuda UI Angkatan XLVIII' },
  { id: 'b-4', date: '2026-11-21', eventName: 'Sweet 17th Birthday Jessica' },
  { id: 'b-5', date: '2026-11-28', eventName: 'Wedding Nabila & Reza' },
];

export const DEFAULT_FINANCIAL_EVENTS = [
  {
    id: 'fe-1',
    name: 'Wedding Cindy & Arya',
    date: '2026-10-30',
    grossAmount: 4850000,
    partnerShare: 1200000,
    netStudio: 3650000,
  },
  {
    id: 'fe-2',
    name: 'Wisuda UI Angkatan XLVIII',
    date: '2026-10-28',
    grossAmount: 3400000,
    partnerShare: 680000,
    netStudio: 2720000,
  },
  {
    id: 'fe-3',
    name: 'Gala Dinner Bank Mandiri',
    date: '2026-10-20',
    grossAmount: 6350000,
    partnerShare: 1500000,
    netStudio: 4850000,
  },
  {
    id: 'fe-4',
    name: 'Birthday Party Jessica (Malang)',
    date: '2026-10-14',
    grossAmount: 2400000,
    partnerShare: 400000,
    netStudio: 2000000,
  },
];

export const initialFinancialEvents = DEFAULT_FINANCIAL_EVENTS;

export const DEFAULT_SITE_SETTINGS = {
  company_name: 'Memoribox Indonesia',
  whatsapp_number: '6281234567890',
  address: 'Jl. Kemang Raya No. 18, Jakarta Selatan 12730',
  instagram: '@memoribox.id',
  website: 'https://memoribox.id',
  bank_name: 'BCA',
  bank_account_number: '800-123-4567',
  bank_account_holder: 'MEMORIBOX INDONESIA PT',
};

// Default Linktree data for Memoribox
// Disimpan di Supabase tabel 'settings' dengan key 'linktree'

export const DEFAULT_LINKTREE_PROFILE = {
  name: 'MemoriBox',
  handle: '',
  bio: 'Photobooth & photobox untuk acara Anda. Cetak instan, foto digital via QR.',
  avatarUrl: '/logo.png',
  verified: true,
  socials: [
    { platform: 'whatsapp', url: '', label: 'WhatsApp' },
    { platform: 'instagram', url: '', label: 'Instagram' },
    { platform: 'tiktok', url: '', label: 'TikTok' },
    { platform: 'website', url: '', label: 'Website Utama' }
  ],
  concierge: {
    show: true,
    title: 'Konsultasi & Reservasi Acara',
    subtitle: 'Pernikahan, wisuda, corporate gathering, & custom photobooth.',
    buttonText: 'Hubungi WhatsApp',
    buttonUrl: ''
  }
};

// Daftar tautan dimulai kosong; diisi dari menu Tautan di admin.
export const DEFAULT_LINKS = [];

export const LINK_CATEGORIES = [
  'Event & Kegiatan',
  'Layanan & Booking',
  'Portofolio',
  'Kontak & Sosmed'
];

import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ModalProvider } from '@/components/ui/ModalProvider';
import './globals.css';

const heading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// OG image dan aset metadata harus memakai domain yang sedang aktif.
// VERCEL_PROJECT_PRODUCTION_URL diisi otomatis oleh Vercel (tanpa protokol).
const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'memoribox.id'}`;

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'MemoriBox.id – Photobooth & Smart Queue',
    template: '%s | MemoriBox.id',
  },
  description:
    'Sewa photobooth & photobox untuk pernikahan, wisuda, dan acara korporat di Jabodetabek & Bali. Cetak foto langsung di lokasi, foto digital via QR, dan antrean digital cerdas.',
  keywords: [
    'photobooth',
    'photobox',
    'sewa photobooth',
    'photobooth pernikahan',
    'photobooth wisuda',
    'photobooth jakarta',
    'photobooth bali',
    'smart queue',
    'antrian digital',
    'memoribox',
  ],
  authors: [{ name: 'MemoriBox', url: 'https://memoribox.id' }],
  creator: 'MemoriBox',
  publisher: 'MemoriBox',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://memoribox.id',
    siteName: 'MemoriBox.id',
    title: 'MemoriBox.id – Photobooth & Smart Queue',
    description:
      'Sewa photobooth & photobox untuk pernikahan, wisuda, dan acara korporat. Cetak foto langsung di lokasi, foto digital via QR, antrian digital cerdas.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MemoriBox – Photobooth & Smart Queue',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MemoriBox.id – Photobooth & Smart Queue',
    description:
      'Sewa photobooth & photobox untuk pernikahan, wisuda, dan acara korporat. Cetak foto langsung di lokasi.',
    images: ['/og-image.png'],
    creator: '@memoribox',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFC400',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${heading.variable} ${body.variable}`}>
      <body className="bg-bg text-ink-900 font-body antialiased min-h-screen selection:bg-yellow-200 selection:text-ink-900">
        <ModalProvider>
          {children}
        </ModalProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

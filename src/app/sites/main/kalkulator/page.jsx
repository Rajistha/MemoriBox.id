import React from 'react';
import SiteShell from '@/components/landing/SiteShell';
import PackageCalculator from '@/components/landing/PackageCalculator';
import { getGallery, getPackages } from '@/lib/publicData';

export const revalidate = 300;

export const metadata = {
  title: 'Kalkulator Paket Photobooth',
  description:
    'Hitung kebutuhan dan estimasi harga paket photobooth yang paling cocok untuk acara Anda. Masukkan jumlah tamu, durasi, dan pilih fitur sesuai kebutuhan.',
  alternates: {
    canonical: 'https://memoribox.id/kalkulator',
  },
  openGraph: {
    title: 'Kalkulator Paket Photobooth – MemoriBox.id',
    description:
      'Hitung kebutuhan photobooth dan temukan paket terbaik untuk acara Anda bersama MemoriBox.',
    url: 'https://memoribox.id/kalkulator',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kalkulator Paket – MemoriBox',
      },
    ],
  },
  twitter: {
    title: 'Kalkulator Paket Photobooth – MemoriBox.id',
    description: 'Hitung kebutuhan photobooth dan temukan paket terbaik untuk acara Anda.',
    images: ['/og-image.png'],
  },
};

export default async function KalkulatorPage() {
  const [packages, gallery] = await Promise.all([getPackages(), getGallery(1)]);

  return (
    <SiteShell showGallery={gallery.length > 0}>
      <PackageCalculator packages={packages} standalone />
    </SiteShell>
  );
}

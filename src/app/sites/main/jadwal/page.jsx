import React from 'react';
import SiteShell from '@/components/landing/SiteShell';
import AvailabilityBoard from '@/components/landing/AvailabilityBoard';
import { getBookedEvents, getGallery } from '@/lib/publicData';

export const revalidate = 300;

export const metadata = {
  title: 'Cek Ketersediaan Tanggal',
  description:
    'Cek tanggal yang masih tersedia untuk sewa photobooth MemoriBox di Jabodetabek dan Bali. Pesan sebelum tanggal favorit Anda terisi.',
  alternates: {
    canonical: 'https://memoribox.id/jadwal',
  },
  openGraph: {
    title: 'Cek Ketersediaan Tanggal – MemoriBox.id',
    description: 'Cek tanggal yang masih tersedia untuk sewa photobooth di Jabodetabek dan Bali.',
    url: 'https://memoribox.id/jadwal',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cek Jadwal – MemoriBox',
      },
    ],
  },
  twitter: {
    title: 'Cek Ketersediaan Tanggal – MemoriBox.id',
    description: 'Cek tanggal yang masih tersedia untuk sewa photobooth di Jabodetabek dan Bali.',
    images: ['/og-image.png'],
  },
};

export default async function JadwalPage() {
  const [bookedEvents, gallery] = await Promise.all([getBookedEvents(), getGallery(1)]);

  return (
    <SiteShell showGallery={gallery.length > 0}>
      <section className="pt-28 md:pt-32 pb-16 md:pb-24 bg-gray-50 min-h-[70vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">Ketersediaan</p>
          <h1 className="mt-3 font-heading font-extrabold text-3xl sm:text-4xl text-ink-900 tracking-tight">
            Cek tanggal acara
          </h1>
          <span className="block w-12 h-1 bg-yellow-500 mt-4 rounded-full" aria-hidden="true" />
          <div className="mt-8">
            <AvailabilityBoard events={bookedEvents} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

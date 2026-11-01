import React from 'react';
import SiteShell from '@/components/landing/SiteShell';
import GalleryGrid from '@/components/landing/GalleryGrid';
import { getGallery } from '@/lib/publicData';

export const revalidate = 300;

export const metadata = {
  title: 'Galeri Foto Photobooth',
  description:
    'Lihat koleksi foto dari berbagai acara yang pernah ditangani MemoriBox: pernikahan, wisuda, ulang tahun, dan acara korporat.',
  alternates: {
    canonical: 'https://memoribox.id/galeri',
  },
  openGraph: {
    title: 'Galeri Foto Photobooth – MemoriBox.id',
    description: 'Koleksi hasil foto photobooth dari berbagai acara yang pernah ditangani MemoriBox.',
    url: 'https://memoribox.id/galeri',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Galeri Foto – MemoriBox',
      },
    ],
  },
  twitter: {
    title: 'Galeri Foto Photobooth – MemoriBox.id',
    description: 'Koleksi hasil foto photobooth dari berbagai acara yang pernah ditangani MemoriBox.',
    images: ['/og-image.png'],
  },
};

export default async function GaleriPage() {
  const gallery = await getGallery();

  return (
    <SiteShell showGallery={gallery.length > 0}>
      <section className="pt-28 md:pt-32 pb-16 md:pb-24 bg-white min-h-[70vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">Galeri</p>
          <h1 className="mt-3 font-heading font-extrabold text-3xl sm:text-4xl text-ink-900 tracking-tight">
            Hasil foto MemoriBox
          </h1>
          <span className="block w-12 h-1 bg-yellow-500 mt-4 rounded-full" aria-hidden="true" />
          <div className="mt-8">
            <GalleryGrid gallery={gallery} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

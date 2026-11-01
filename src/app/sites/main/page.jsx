import React from 'react';
import SiteShell from '@/components/landing/SiteShell';
import Hero from '@/components/landing/Hero';
import Services from '@/components/landing/Services';
import GalleryCarousel from '@/components/landing/GalleryCarousel';
import PricePackages from '@/components/landing/PricePackages';
import BookingCalendarSection from '@/components/landing/BookingCalendarSection';
import OfflineLocations from '@/components/landing/OfflineLocations';
import ClientMarquee from '@/components/landing/ClientMarquee';
import ReviewSlider from '@/components/landing/ReviewSlider';
import FaqSection from '@/components/landing/FaqSection';
import ContactSection from '@/components/landing/ContactSection';
import { getLandingData } from '@/lib/publicData';

// Incremental Static Regeneration (ISR): data publik disegarkan tiap 5 menit.
export const revalidate = 300;

export const metadata = {
  title: 'Sewa Photobooth & Photobox Terbaik – Jabodetabek & Bali',
  description:
    'Sewa photobooth & photobox untuk pernikahan, wisuda, dan acara korporat. Cetak foto instan di lokasi, foto digital via QR, dan antrean digital cerdas. Pesan sekarang!',
  alternates: {
    canonical: 'https://memoribox.id',
  },
  openGraph: {
    title: 'MemoriBox.id – Sewa Photobooth & Smart Queue',
    description:
      'Photobooth profesional untuk pernikahan, wisuda, dan acara korporat. Cetak instan, QR digital, antrian cerdas.',
    url: 'https://memoribox.id',
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
    title: 'MemoriBox.id – Sewa Photobooth & Smart Queue',
    description:
      'Photobooth profesional untuk pernikahan, wisuda, dan acara korporat. Cetak instan, QR digital, antrian cerdas.',
    images: ['/og-image.png'],
  },
};

export default async function MainPage() {
  const { packages, gallery, reviews, logos, bookedEvents, offline, profile } = await getLandingData();

  return (
    <SiteShell showGallery={gallery.length > 0}>
      <Hero
        gallery={gallery}
        logos={logos}
        points={profile.highlights}
        mosaic={profile.heroMosaic}
        eyebrow={['Photobooth & Photobox', profile.area].filter(Boolean).join(' · ')}
      />
      <ClientMarquee logos={logos} />
      <Services services={profile.services} />
      <GalleryCarousel gallery={gallery} />
      <PricePackages packages={packages} />
      <OfflineLocations locations={offline} />
      <BookingCalendarSection events={bookedEvents} />
      <ReviewSlider reviews={reviews} />
      <FaqSection faqs={profile.faqs} />
      <ContactSection />
    </SiteShell>
  );
}

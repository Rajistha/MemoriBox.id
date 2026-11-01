'use client';

import React, { useState } from 'react';
import { FiMapPin, FiMail, FiInstagram } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { mapEmbedUrl } from '@/lib/siteProfile';
import { useWhatsApp } from './SiteProfileContext';
import WhatsAppModal from './WhatsAppModal';
import Reveal from './Reveal';

/** Kontak: seluruh data dari profil admin; baris yang kosong tidak ditampilkan. */
export function ContactSection() {
  const { openWhatsApp, profile } = useWhatsApp();
  const [showMap, setShowMap] = useState(false);
  const embed = mapEmbedUrl(profile);
  const hasWa = Boolean(profile.whatsapp);

  return (
    <section id="kontak" className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="rounded-4xl bg-yellow-500 overflow-hidden grid lg:grid-cols-12">
          <div className={`${embed ? 'lg:col-span-6' : 'lg:col-span-12'} p-6 sm:p-10 lg:p-12 text-ink-900`}>
            <p className="text-sm font-bold">Kontak</p>
            <h2 className="mt-2 font-heading font-extrabold text-3xl sm:text-4xl tracking-tight leading-tight">
              Ceritakan rencana acara Anda.
            </h2>

            <ul className="mt-6 space-y-3.5 text-sm font-medium">
              {profile.address && (
                <li className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 shrink-0" /> {profile.address}
                </li>
              )}
              {profile.area && (
                <li className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 shrink-0 opacity-0" aria-hidden="true" /> Melayani {profile.area}
                </li>
              )}
              {(profile.phoneDisplay || hasWa) && (
                <li className="flex items-start gap-3">
                  <SiWhatsapp className="mt-0.5 shrink-0" /> {profile.phoneDisplay || `+${profile.whatsapp}`}
                </li>
              )}
              {profile.email && (
                <li className="flex items-start gap-3">
                  <FiMail className="mt-0.5 shrink-0" />
                  <a href={`mailto:${profile.email}`} className="underline-offset-2 hover:underline">
                    {profile.email}
                  </a>
                </li>
              )}
              {profile.instagram && (
                <li className="flex items-start gap-3">
                  <FiInstagram className="mt-0.5 shrink-0" />
                  <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                    @{profile.instagram}
                  </a>
                </li>
              )}
            </ul>

            {hasWa && (
              <button
                type="button"
                onClick={() =>
                  openWhatsApp(
                    <WhatsAppModal defaultMessage="Halo MemoriBox, saya ingin berkonsultasi tentang photobooth untuk acara saya. Tanggal acara: ... Lokasi: ... Perkiraan jumlah tamu: ..." />
                  )
                }
                className="mt-8 inline-flex items-center justify-center gap-2 h-13 px-7 rounded-full bg-white text-ink-900 font-bold text-sm hover:bg-yellow-50 transition-colors"
              >
                <SiWhatsapp className="text-lg" /> Chat via WhatsApp
              </button>
            )}
          </div>

          {embed && (
            <div className="lg:col-span-6 min-h-72 lg:min-h-112 bg-yellow-100 flex items-center justify-center p-4">
              {showMap ? (
                <iframe
                  title="Lokasi MemoriBox"
                  src={embed}
                  className="w-full h-full min-h-72 lg:min-h-112 rounded-2xl border-0"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="text-center max-w-xs">
                  <span className="size-14 rounded-2xl bg-white text-ink-900 inline-flex items-center justify-center text-2xl">
                    <FiMapPin />
                  </span>
                  <p className="mt-4 font-heading font-bold text-ink-900">Peta lokasi</p>
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="mt-4 h-11 px-6 rounded-full bg-ink-900 text-white text-sm font-bold hover:bg-ink-700 transition-colors"
                  >
                    Tampilkan Peta
                  </button>
                </div>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export default ContactSection;

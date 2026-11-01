import React from 'react';
import Image from 'next/image';
import { FiArrowRight, FiMapPin } from 'react-icons/fi';
import { mapsLink, statusLabel } from '@/lib/offlineLocations';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const BADGE = {
  open: 'bg-green-50 text-success border-green-200',
  soon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  closed: 'bg-red-50 text-danger border-red-200',
};

/** "Temukan Memoribox Offline": lokasi photobooth tetap, diatur dari panel admin (menu Lokasi Offline). */
export function OfflineLocations({ locations = [] }) {
  if (locations.length === 0) return null;

  return (
    <section id="lokasi" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Lokasi tetap"
          title="Temukan Memoribox Offline"
        />

        <ul className={`mt-10 grid gap-6 ${locations.length === 1 ? 'max-w-xl mx-auto' : 'md:grid-cols-2'}`}>
          {locations.map((loc, i) => (
            <Reveal as="li" key={loc.id} delay={i * 120}>
              <article className="h-full rounded-4xl border border-line bg-surface shadow-card p-4 sm:p-5 flex flex-col">
                <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-yellow-50">
                  {loc.image_url && (
                    <Image src={loc.image_url} alt={loc.title} fill sizes="(max-width: 768px) 100vw, 540px" className="object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 mt-5">
                  <span className="text-sm font-semibold text-ink-700 truncate">{loc.partner}</span>
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.12em] shrink-0 ${BADGE[loc.status] || BADGE.open}`}>
                    {statusLabel(loc.status)}
                  </span>
                </div>
                <h3 className="mt-2 font-heading font-extrabold text-2xl text-ink-900">{loc.title}</h3>
                {loc.city && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
                    <FiMapPin className="shrink-0" /> {loc.city}
                  </p>
                )}
                <a
                  href={mapsLink(loc)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto pt-0"
                >
                  <span className="mt-5 flex items-center justify-center gap-2 h-12 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm hover:bg-yellow-600 transition-colors">
                    Petunjuk Arah <FiArrowRight />
                  </span>
                </a>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default OfflineLocations;

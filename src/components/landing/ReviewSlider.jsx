import React from 'react';
import { FiStar } from 'react-icons/fi';
import SectionHeader from './SectionHeader';

const MIN_CARDS = 6; // jumlah minimum kartu per separuh lintasan agar selalu memenuhi lebar layar

/**
 * Ulasan dalam satu baris yang bergeser otomatis tanpa putus. Bila ulasan sedikit, daftar diulang
 * otomatis; lintasan diduplikasi supaya loop mulus. Berhenti saat di-hover.
 */
export function ReviewSlider({ reviews = [] }) {
  if (reviews.length === 0) return null;

  const repeat = Math.max(1, Math.ceil(MIN_CARDS / reviews.length));
  const half = Array.from({ length: repeat }, () => reviews).flat();
  const duration = Math.max(40, half.length * 9);

  return (
    <section id="ulasan" className="py-16 md:py-24 bg-gray-50 border-y border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader eyebrow="Ulasan" title="Kata klien yang sudah menggunakan layanan kami." />
      </div>

      <div
        className="marquee overflow-hidden mt-10"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
      >
        <div className="marquee-track items-stretch" style={{ '--marquee-duration': `${duration}s` }}>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-stretch" aria-hidden={copy === 1}>
              {half.map((r, i) => (
                <li key={`${copy}-${r.id}-${i}`} className="w-72 sm:w-80 mx-2.5 shrink-0 flex">
                  <figure className="w-full rounded-3xl border border-line bg-surface p-6 flex flex-col">
                    <div className="flex gap-0.5 text-yellow-600" aria-label={`Rating ${r.rating} dari 5`}>
                      {Array.from({ length: 5 }).map((_, k) => (
                        <FiStar key={k} className={k < r.rating ? 'fill-yellow-500' : 'text-ink-300'} size={15} />
                      ))}
                    </div>
                    <blockquote className="mt-3 text-sm text-ink-700 leading-relaxed flex-1">{r.comment}</blockquote>
                    {(r.name || r.role) && (
                      <figcaption className="mt-4 pt-4 border-t border-line">
                        {r.name && <p className="text-sm font-bold text-ink-900">{r.name}</p>}
                        {r.role && <p className="text-xs text-ink-500">{r.role}</p>}
                      </figcaption>
                    )}
                  </figure>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewSlider;

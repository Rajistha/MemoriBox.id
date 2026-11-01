import React from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { DEFAULT_PACKAGES, formatRupiah, startFrom } from '@/lib/pricelistDefaults';
import { accentOf } from '@/lib/packageAccent';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

/** Tiga kartu paket; setiap paket membuka halaman detailnya sendiri di /paket/[id]. */
export function PricePackages({ packages = DEFAULT_PACKAGES }) {
  if (packages.length === 0) return null;

  return (
    <section id="paket" className="py-16 md:py-24 bg-gray-50 border-y border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Paket layanan"
          title="Pilih paket yang cocok untuk acara Anda."
        />

        <ul className="mt-10 grid md:grid-cols-3 gap-5">
          {packages.map((p, idx) => {
            const accent = accentOf(p.id);
            return (
              <Reveal as="li" key={p.id} delay={idx * 110} className="flex">
                <article className="group flex flex-col w-full rounded-3xl bg-surface border border-line shadow-card overflow-hidden hover:shadow-float hover:-translate-y-1 transition duration-300">
                  <div className={`h-1.5 ${accent.bar}`} aria-hidden="true" />
                  <div className="p-6 flex flex-col flex-1">
                    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${accent.label}`}>
                      {p.badge || 'Paket sewa'}
                    </p>
                    <h3 className="mt-2 font-heading font-extrabold text-2xl text-ink-900">{p.label}</h3>
                    <p className="mt-2 text-sm text-ink-700 leading-relaxed">{p.tagline}</p>

                    <ul className="mt-4 space-y-2 text-sm text-ink-700">
                      {p.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <FiCheck className="mt-0.5 shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-6">
                      <p className="text-xs font-semibold text-ink-500">Mulai dari</p>
                      <p className="font-heading font-extrabold text-2xl text-ink-900">{formatRupiah(startFrom(p))}</p>
                      <Link
                        href={`/paket/${p.id}`}
                        className="mt-4 flex items-center justify-between h-12 px-5 rounded-full bg-white border border-ink-300 text-ink-900 text-sm font-bold group-hover:bg-yellow-500 group-hover:border-yellow-500 transition-colors"
                      >
                        Lihat detail {p.label}
                        <FiArrowRight />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default PricePackages;

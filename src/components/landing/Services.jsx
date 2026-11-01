import React from 'react';
import { iconFor } from '@/lib/serviceIcons';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

/** Kartu layanan; isi (ikon, judul, deskripsi) diatur dari menu Profil di admin. */
export function Services({ services = [] }) {
  if (services.length === 0) return null;

  return (
    <section id="layanan" className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader eyebrow="Layanan" title="Satu tim untuk semua kebutuhan photobooth acara Anda." className="mb-10" />

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {services.map((item, i) => {
            const Icon = iconFor(item.icon);
            return (
              <Reveal as="li" key={`${item.title}-${i}`} delay={(i % 3) * 90} className="flex">
              <div className="w-full rounded-3xl bg-surface border border-line p-6 hover:border-yellow-500 hover:shadow-card hover:-translate-y-1 transition duration-300">
                <span className="size-12 rounded-2xl bg-yellow-500 text-ink-900 flex items-center justify-center">
                  <Icon className="text-xl" />
                </span>
                <h3 className="mt-4 font-heading font-bold text-ink-900">{item.title}</h3>
                {item.desc && <p className="mt-1.5 text-sm text-ink-700 leading-relaxed">{item.desc}</p>}
              </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default Services;

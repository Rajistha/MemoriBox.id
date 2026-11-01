import React from 'react';
import Reveal from './Reveal';

/** Judul seksi di tengah: label kecil, judul, garis aksen kuning. */
export function SectionHeader({ eyebrow, title, desc, className = '' }) {
  return (
    <Reveal className={`max-w-2xl mx-auto text-center ${className}`}>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500 mb-3">{eyebrow}</p>}
      <h2 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight leading-tight text-ink-900">{title}</h2>
      <span className="block w-12 h-1 bg-yellow-500 mx-auto mt-4 rounded-full" aria-hidden="true" />
      {desc && <p className="mt-4 leading-relaxed text-ink-700">{desc}</p>}
    </Reveal>
  );
}

export default SectionHeader;

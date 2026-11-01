'use client';

import React from 'react';
import Image from 'next/image';
import { FiX } from 'react-icons/fi';

const CATEGORY_LABEL = {
  wedding: 'Pernikahan',
  corporate: 'Perusahaan',
  birthday: 'Ulang Tahun',
  party: 'Pesta',
  graduation: 'Wisuda',
  event: 'Event',
};

export const labelOf = (c) =>
  CATEGORY_LABEL[String(c).toLowerCase()] || (c ? String(c).charAt(0).toUpperCase() + String(c).slice(1) : 'Lainnya');

export const categoriesOf = (gallery) => [...new Set(gallery.map((g) => g.category).filter(Boolean))];

/** Pratinjau foto besar di dalam modal (dibuka lewat useModal().open). */
export function GalleryLightbox({ item, onClose }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading font-bold text-ink-900 truncate">{item.title || labelOf(item.category)}</p>
        <button
          type="button"
          onClick={() => onClose()}
          className="size-11 -mr-2 flex items-center justify-center rounded-xl text-ink-700 hover:bg-yellow-50"
          aria-label="Tutup"
        >
          <FiX className="text-xl" />
        </button>
      </div>
      <div className="relative w-full aspect-3/4 max-h-[70vh] rounded-xl overflow-hidden bg-gray-100">
        <Image src={item.url} alt={item.alt || 'Foto acara MemoriBox'} fill sizes="(max-width: 768px) 100vw, 672px" className="object-contain" />
      </div>
    </div>
  );
}

export function FilterPills({ categories, value, onChange }) {
  if (categories.length < 2) return null;
  return (
    <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter kategori">
      {['all', ...categories].map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={value === c}
          onClick={() => onChange(c)}
          className={`px-5 h-11 rounded-full text-sm font-semibold shrink-0 transition-colors border ${
            value === c ? 'bg-yellow-500 border-yellow-500 text-ink-900' : 'bg-surface border-line text-ink-700 hover:bg-yellow-50'
          }`}
        >
          {c === 'all' ? 'Semua' : labelOf(c)}
        </button>
      ))}
    </div>
  );
}

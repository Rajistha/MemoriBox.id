'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { GalleryViewer, FilterPills, categoriesOf, labelOf } from './GalleryLightbox';

const PAGE = 20;

/** Halaman /galeri: seluruh foto dengan filter kategori dan pemuatan bertahap. */
export function GalleryGrid({ gallery = [] }) {
  const [viewing, setViewing] = useState(null);
  const [category, setCategory] = useState('all');
  const [visible, setVisible] = useState(PAGE);

  const categories = useMemo(() => categoriesOf(gallery), [gallery]);
  const items = category === 'all' ? gallery : gallery.filter((g) => g.category === category);

  if (gallery.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-300 bg-surface px-5 py-10 text-center text-sm text-ink-700">
        Belum ada foto di galeri.
      </p>
    );
  }

  return (
    <div>
      <FilterPills
        categories={categories}
        value={category}
        onChange={(c) => {
          setCategory(c);
          setVisible(PAGE);
        }}
      />

      <GalleryViewer items={items.slice(0, visible)} index={viewing} onChange={setViewing} onClose={() => setViewing(null)} />

      <ul className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.slice(0, visible).map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setViewing(i)}
              className="relative block w-full aspect-2/3 overflow-hidden rounded-2xl border border-line bg-gray-100 group"
              aria-label={`Perbesar foto ${item.title || labelOf(item.category)}`}
            >
              <Image
                src={item.url}
                alt={item.alt || 'Foto acara MemoriBox'}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {visible < items.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="h-12 px-8 rounded-full border border-ink-300 text-ink-900 font-bold text-sm hover:bg-yellow-500 hover:border-yellow-500 transition-colors"
          >
            Muat lebih banyak
          </button>
        </div>
      )}
    </div>
  );
}

export default GalleryGrid;

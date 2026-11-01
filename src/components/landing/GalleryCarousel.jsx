'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SectionHeader from './SectionHeader';
import { GalleryViewer, FilterPills, categoriesOf, labelOf } from './GalleryLightbox';

const PREVIEW = 12;

/** Galeri di beranda: filter kategori + carousel foto yang bisa digeser. "Muat lebih banyak" membuka halaman /galeri. */
export function GalleryCarousel({ gallery = [] }) {
  const [viewing, setViewing] = useState(null);
  const [category, setCategory] = useState('all');
  const trackRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  const categories = useMemo(() => categoriesOf(gallery), [gallery]);
  const items = (category === 'all' ? gallery : gallery.filter((g) => g.category === category)).slice(0, PREVIEW);

  // Panah geser hanya perlu bila foto tidak muat dalam satu layar.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  if (gallery.length === 0) return null;

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section id="galeri" className="py-16 md:py-24 bg-white border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader eyebrow="Galeri" title="Hasil foto dari acara yang pernah kami tangani." />

        <div className="mt-8">
          <FilterPills categories={categories} value={category} onChange={setCategory} />
        </div>

        <div className="relative mt-8">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className={`${overflowing ? 'hidden md:flex' : 'hidden'} absolute -left-5 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-surface border border-line shadow-float items-center justify-center hover:bg-yellow-500 hover:border-yellow-500 transition-colors`}
            aria-label="Geser ke kiri"
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className={`${overflowing ? 'hidden md:flex' : 'hidden'} absolute -right-5 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-surface border border-line shadow-float items-center justify-center hover:bg-yellow-500 hover:border-yellow-500 transition-colors`}
            aria-label="Geser ke kanan"
          >
            <FiChevronRight />
          </button>

          <ul
            ref={trackRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, i) => (
              <li key={item.id} className="snap-start shrink-0 w-56 sm:w-64 lg:w-72 first:ml-auto last:mr-auto">
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
                    sizes="(max-width: 640px) 224px, 288px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <GalleryViewer items={items} index={viewing} onChange={setViewing} onClose={() => setViewing(null)} />

        {gallery.length > items.length && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/galeri"
            className="inline-flex items-center h-12 px-8 rounded-full border border-ink-300 text-ink-900 font-bold text-sm hover:bg-yellow-500 hover:border-yellow-500 transition-colors"
          >
            Muat lebih banyak
          </Link>
        </div>
        )}
      </div>
    </section>
  );
}

export default GalleryCarousel;

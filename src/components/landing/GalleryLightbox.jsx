'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

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

/**
 * Penampil foto layar penuh: panah sebelumnya/berikutnya, penghitung, kunci panah & Esc, geser di layar sentuh.
 * `items` adalah daftar yang sedang tampil; `index` null berarti tertutup.
 */
export function GalleryViewer({ items, index, onChange, onClose }) {
  const touchX = useRef(null);
  const open = index !== null && index !== undefined && items[index];
  const total = items.length;

  const go = useCallback((delta) => onChange((index + delta + total) % total), [index, total, onChange]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, go, onClose]);

  if (!open) return null;
  const item = items[index];

  return (
    <div
      className="fixed inset-0 z-100 bg-ink-900/95 backdrop-blur-sm flex flex-col items-center justify-center px-4 py-6 anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Penampil foto"
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null || total < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        onClick={onClose}
        autoFocus
        className="absolute top-4 right-4 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Tutup"
      >
        <FiX className="text-xl" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Foto sebelumnya"
          >
            <FiChevronLeft className="text-xl" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Foto berikutnya"
          >
            <FiChevronRight className="text-xl" />
          </button>
        </>
      )}

      <div className="relative w-full max-w-md h-[68vh] sm:h-[72vh]" onClick={(e) => e.stopPropagation()}>
        <Image
          key={item.id}
          src={item.url}
          alt={item.alt || 'Foto acara MemoriBox'}
          fill
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-contain rounded-2xl"
          priority
        />
      </div>

      <div className="mt-5 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-500">{labelOf(item.category)}</p>
        {item.title && <p className="mt-1 font-heading font-bold text-lg text-white">{item.title}</p>}
        <p className="mt-3 inline-block px-3 h-7 leading-7 rounded-full bg-white/10 text-white text-xs font-semibold">
          {index + 1} / {total}
        </p>
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

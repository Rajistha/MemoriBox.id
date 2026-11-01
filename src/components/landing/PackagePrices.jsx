'use client';

import React from 'react';
import { SiWhatsapp } from 'react-icons/si';
import { formatRupiah } from '@/lib/pricelistDefaults';
import { useWhatsApp } from './SiteProfileContext';
import WhatsAppModal from './WhatsAppModal';

/** Daftar varian harga; tombol "Pesan" menjadi kuning saat barisnya di-hover. */
export function PackagePrices({ pkg }) {
  const { openWhatsApp } = useWhatsApp();

  const ask = (price) => {
    const variant = `${price.label}${price.sub ? ` (${price.sub})` : ''}`;
    openWhatsApp(<WhatsAppModal
        title={`Pesan ${pkg.label}`}
        defaultMessage={`Halo Memoribox, saya tertarik dengan paket ${pkg.label} varian ${variant} (${formatRupiah(price.price)}). Apakah tanggal acara saya masih tersedia?`}
      />
    );
  };

  return (
    <ul className="divide-y divide-line border-y border-line">
      {pkg.prices.map((price) => (
        <li
          key={price.label}
          className="group flex items-center gap-3 sm:gap-5 py-3.5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl hover:bg-yellow-50/70 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">{price.label}</p>
            {price.sub && <p className="text-sm text-ink-500">{price.sub}</p>}
          </div>
          <p className="font-heading font-extrabold text-lg text-ink-900 tabular-nums whitespace-nowrap">
            {formatRupiah(price.price)}
          </p>
          <button
            type="button"
            onClick={() => ask(price)}
            className="h-11 px-4 rounded-full bg-white border border-ink-300 text-ink-900 text-sm font-bold inline-flex items-center gap-1.5 shrink-0 group-hover:bg-yellow-500 group-hover:border-yellow-500 transition-colors"
            aria-label={`Pesan ${pkg.label} ${price.label}`}
          >
            <SiWhatsapp /> <span className="hidden sm:inline">Pesan</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default PackagePrices;

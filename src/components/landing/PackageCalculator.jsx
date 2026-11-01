'use client';

import React, { useMemo, useState } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { DEFAULT_PACKAGES, formatRupiah } from '@/lib/pricelistDefaults';
import { useWhatsApp } from './SiteProfileContext';
import WhatsAppModal from './WhatsAppModal';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

// Asumsi estimasi: 1 sesi foto = 1 kelompok (±3 orang), tiap sesi mencetak sejumlah lembar.
const GUESTS_PER_SESSION = 3;

const num = (text) => parseInt(String(text ?? '').replace(/\D/g, ''), 10) || 0;

function Stepper({ label, value, onChange, min, max, step = 1, suffix }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-900 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="size-11 rounded-full border border-line bg-surface flex items-center justify-center hover:bg-yellow-50"
          aria-label={`Kurangi ${label}`}
        >
          <FiMinus />
        </button>
        <div className="flex-1 h-11 rounded-full border border-line bg-surface flex items-center justify-center font-bold text-ink-900">
          {value.toLocaleString('id-ID')} {suffix}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="size-11 rounded-full border border-line bg-surface flex items-center justify-center hover:bg-yellow-50"
          aria-label={`Tambah ${label}`}
        >
          <FiPlus />
        </button>
      </div>
    </div>
  );
}

export function PackageCalculator({ packages = DEFAULT_PACKAGES, standalone = false }) {
  const { openWhatsApp } = useWhatsApp();
  const [guests, setGuests] = useState(150);
  const [hours, setHours] = useState(4);
  const [printsPerSession, setPrintsPerSession] = useState(1);

  const result = useMemo(() => {
    const sessions = Math.ceil(guests / GUESTS_PER_SESSION);
    const prints = sessions * printsPerSession;

    const limited = packages.find((p) => p.id === 'limited');
    const unlimited = packages.find((p) => p.id === 'unlimited');
    const soft = packages.find((p) => p.id === 'softfile');

    const options = [];
    if (soft) {
      const v = [...soft.prices].filter((p) => num(p.label) >= hours).sort((a, b) => a.price - b.price)[0];
      if (v) options.push({ pkg: soft, variant: v, note: 'Hanya file digital, tanpa cetak.' });
    }
    if (limited) {
      const v = [...limited.prices]
        .filter((p) => num(p.label) >= prints && (!p.sub || num(p.sub) >= hours))
        .sort((a, b) => a.price - b.price)[0];
      if (v) options.push({ pkg: limited, variant: v, note: `Kuota cetak ${num(v.label)} lembar mencukupi estimasi ${prints}.` });
    }
    if (unlimited) {
      const v = [...unlimited.prices].filter((p) => num(p.label) >= hours).sort((a, b) => a.price - b.price)[0];
      if (v) options.push({ pkg: unlimited, variant: v, note: 'Cetak sepuasnya, aman untuk tamu banyak.' });
    }
    return { sessions, prints, options };
  }, [guests, hours, printsPerSession, packages]);

  const ask = (opt) => {
    openWhatsApp(<WhatsAppModal
        title="Konsultasi hasil kalkulator"
        defaultMessage={`Halo Memoribox, hasil kalkulator menyarankan paket ${opt.pkg.label} (${opt.variant.label}${opt.variant.sub ? `, ${opt.variant.sub}` : ''}) untuk ±${guests} tamu dengan durasi ${hours} jam. Apakah tanggal acara saya masih tersedia?`}
      />
    );
  };

  return (
    <section id="kalkulator" className={`${standalone ? 'pt-28 md:pt-32 pb-16 md:pb-24 min-h-[70vh]' : 'py-16 md:py-24 border-y border-line'} bg-gray-50`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Kalkulator paket"
          title="Hitung kebutuhan photobooth acara Anda."
        />

        <Reveal className="mt-10 grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-6">
            <Stepper label="Perkiraan jumlah tamu" value={guests} onChange={setGuests} min={10} max={2000} step={10} suffix="tamu" />
            <Stepper label="Durasi acara" value={hours} onChange={setHours} min={2} max={10} suffix="jam" />
            <Stepper label="Cetak per sesi foto" value={printsPerSession} onChange={setPrintsPerSession} min={1} max={3} suffix="lembar" />
            <p className="text-xs text-ink-500">
              Estimasi: {result.sessions} sesi · ±{result.prints} lembar cetak
            </p>
          </div>

          <div className="lg:col-span-7 grid gap-4">
            {result.options.length === 0 ? (
              <div className="rounded-3xl bg-surface border border-line p-8 text-center text-ink-700">
                Kebutuhan Anda melebihi paket standar. Hubungi kami untuk penawaran khusus.
              </div>
            ) : (
              result.options.map((opt, i) => (
                <div
                  key={opt.pkg.id}
                  className={`rounded-3xl p-5 sm:p-6 border flex flex-col sm:flex-row sm:items-center gap-4 ${
                    i === result.options.length - 1 && result.options.length > 1
                      ? 'bg-yellow-500 border-yellow-500'
                      : 'bg-surface border-line'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-extrabold text-lg text-ink-900">{opt.pkg.label}</p>
                    <p className="text-sm text-ink-900/80">
                      {opt.variant.label}
                      {opt.variant.sub ? ` · ${opt.variant.sub}` : ''}
                    </p>
                    <p className="text-xs text-ink-900/70 mt-1">{opt.note}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono font-extrabold text-xl text-ink-900">{formatRupiah(opt.variant.price)}</p>
                    <button
                      type="button"
                      onClick={() => ask(opt)}
                      className="mt-2 h-10 px-5 rounded-full bg-white text-ink-900 border border-ink-900/15 text-xs font-bold hover:bg-yellow-50 transition-colors"
                    >
                      Konsultasi paket ini
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default PackageCalculator;

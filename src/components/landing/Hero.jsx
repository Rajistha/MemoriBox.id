import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

const ROWS = 3;
const MIN_PER_HALF = 8;

/** Strip foto dari maskot Memoribox: grafik buatan sendiri, dipakai selama galeri dan logo belum diisi. */
function PhotoStrip({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-2.5 sm:p-3 shadow-float border border-line ${className}`} aria-hidden="true">
      <div className="space-y-2 sm:space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative aspect-4/3 rounded-lg overflow-hidden bg-yellow-500">
            <Image src="/icon.png" alt="" fill sizes="160px" className={`object-contain p-1 ${i === 1 ? 'scale-110' : ''}`} />
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[10px] font-extrabold tracking-[0.2em] text-ink-900">MEMORIBOX.ID</p>
    </div>
  );
}

function MascotHero() {
  return (
    <div className="relative rounded-4xl bg-yellow-500 h-72 sm:h-120 lg:h-136 overflow-hidden flex items-center justify-center gap-4 sm:gap-6">
      <PhotoStrip className="anim-float w-28 sm:w-36 -rotate-6 mt-10" />
      <PhotoStrip className="anim-float w-32 sm:w-44 z-10 [animation-delay:-2s]" />
      <PhotoStrip className="anim-float w-28 sm:w-36 rotate-6 mb-10 [animation-delay:-4s]" />
    </div>
  );
}

// Selang-seling: frame foto, logo, frame foto, logo, ... (siklus bila salah satu lebih sedikit).
function interleave(photos, logos) {
  const out = [];
  const n = Math.max(photos.length, logos.length);
  for (let i = 0; i < n; i++) {
    if (photos.length) out.push({ kind: 'photo', ...photos[i % photos.length], key: `p${i}` });
    if (logos.length) out.push({ kind: 'logo', ...logos[i % logos.length], key: `l${i}` });
  }
  return out;
}

function Tile({ item }) {
  if (item.kind === 'photo') {
    return (
      <div className="relative h-full aspect-2/3 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        <Image src={item.url} alt={item.alt || 'Hasil foto photobooth Memoribox'} fill sizes="160px" className="object-cover" />
      </div>
    );
  }
  return (
    <div className="relative h-full aspect-square rounded-xl bg-white border border-line shrink-0">
      <Image src={item.logo_url} alt={item.client_name || 'Logo klien'} fill sizes="160px" className="object-contain p-3" />
    </div>
  );
}

/** Mozaik bergerak ke samping: tiap baris berjalan berlawanan arah, berisi frame foto dan logo klien bergantian. */
function MosaicHero({ photos, logos }) {
  // Foto dan logo dibagi bergiliran ke tiap baris agar isi barisnya berbeda. Bila item lebih sedikit dari jumlah baris,
  // baris memakai daftar penuh yang digeser supaya tidak sama persis.
  const share = (list, r) => {
    const part = list.filter((_, i) => i % ROWS === r);
    if (part.length) return part;
    return list.length ? [...list.slice(r % list.length), ...list.slice(0, r % list.length)] : [];
  };
  const rows = Array.from({ length: ROWS }, (_, r) => {
    let seq = interleave(share(photos, r), share(logos, r));
    if (!seq.length) return seq;
    while (seq.length < MIN_PER_HALF) seq = [...seq, ...seq];
    return seq;
  });

  return (
    <div
      className="rounded-4xl bg-white border border-line shadow-float p-3 sm:p-4 overflow-hidden space-y-3 sm:space-y-4"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}
    >
      {rows.map((seq, r) => seq.length > 0 && (
        <div key={r} className="marquee overflow-hidden h-36 sm:h-44">
          <div
            className={`marquee-track h-full gap-3 sm:gap-4 ${r % 2 ? 'marquee-reverse' : ''}`}
            style={{ '--marquee-duration': `${46 + r * 8}s` }}
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex h-full gap-3 sm:gap-4 pr-3 sm:pr-4" aria-hidden={copy === 1}>
                {seq.map((item, i) => (
                  <Tile key={`${copy}-${item.key}-${i}`} item={item} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Hero({ gallery = [], logos = [], points = [], mosaic = false, eyebrow = 'Photobooth & Photobox' }) {
  const photos = gallery.slice(0, 12);
  const logoList = logos.slice(0, 12);
  // Mosaik hanya tampil bila diaktifkan di admin (Profil) dan ada foto atau logo; selain itu maskot.
  const useMosaic = mosaic && photos.length + logoList.length > 0;

  return (
    <section id="beranda" className="pt-24 md:pt-36 pb-16 md:pb-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        <div className="lg:col-span-5">
          <p className="anim-rise text-xs font-bold uppercase tracking-[0.18em] text-ink-500">{eyebrow}</p>
          <h1 style={{ animationDelay: '90ms' }} className="anim-rise mt-4 font-heading font-extrabold text-ink-900 tracking-tight leading-[1.1] text-4xl sm:text-5xl">
            Photobooth profesional untuk setiap acara Anda.
          </h1>
          <p style={{ animationDelay: '180ms' }} className="anim-rise mt-5 text-lg text-ink-700 leading-relaxed">Cetak instan di lokasi, foto digital via QR.</p>

          <div style={{ animationDelay: '270ms' }} className="anim-rise mt-8 flex flex-wrap gap-3">
            <Link
              href="/#paket"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm hover:bg-yellow-600 transition-colors"
            >
              Lihat Paket <FiArrowRight />
            </Link>
            <Link
              href="/jadwal"
              className="inline-flex items-center justify-center h-12 px-7 rounded-full border border-ink-300 text-ink-900 font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Cek Jadwal
            </Link>
          </div>

          {points.length > 0 && (
          <ul style={{ animationDelay: '360ms' }} className="anim-rise mt-9 pt-6 border-t border-line space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm font-medium text-ink-900">
                <span className="size-5 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                  <FiCheck className="text-[11px]" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          )}
        </div>

        <div className="order-first lg:order-last lg:col-span-7 min-w-0">
          <div style={{ animationDelay: '200ms' }} className="anim-rise">
            {useMosaic ? <MosaicHero photos={photos} logos={logoList} /> : <MascotHero />}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;

import React from 'react';
import Image from 'next/image';

const MIN_TILES = 10; // jumlah minimum logo per separuh lintasan agar selalu memenuhi lebar layar

/**
 * Logo klien bergerak ke samping tanpa putus. Bila logo sedikit (bahkan satu),
 * daftar diulang otomatis sampai cukup panjang; lintasan diduplikasi agar loop mulus.
 */
export function ClientMarquee({ logos = [] }) {
  if (logos.length === 0) return null;

  const repeat = Math.max(1, Math.ceil(MIN_TILES / logos.length));
  const half = Array.from({ length: repeat }, () => logos).flat();
  const duration = Math.max(24, half.length * 3);

  return (
    <section className="py-12 border-y border-line bg-surface" aria-label="Klien dan mitra">
      <p className="text-center text-sm font-semibold text-ink-500 mb-8 px-4">Dipercaya oleh klien dan mitra kami</p>

      <div
        className="marquee overflow-hidden"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
      >
        <div className="marquee-track" style={{ '--marquee-duration': `${duration}s` }}>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {half.map((logo, i) => (
                <li key={`${copy}-${logo.id}-${i}`} className="relative h-12 w-32 sm:w-40 mx-6 sm:mx-8 shrink-0 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition">
                  <Image src={logo.logo_url} alt={copy === 0 ? logo.client_name || 'Logo klien' : ''} fill sizes="160px" className="object-contain" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ClientMarquee;

import React from 'react';
import { FiMail } from 'react-icons/fi';
import { SiInstagram, SiTiktok, SiWhatsapp } from 'react-icons/si';
import { waUrl } from '@/lib/siteProfile';
import Reveal from './Reveal';

const tileCls =
  'size-14 flex items-center justify-center rounded-2xl bg-white/70 border border-ink-900/10 text-ink-900 text-2xl hover:bg-white hover:-translate-y-0.5 transition';

/** Pita kuning berisi tautan sosial dan kontak dari profil admin; kolom yang kosong tidak tampil. */
export function FindUs({ profile }) {
  const wa = waUrl(profile);
  const items = [
    profile.tiktok && { href: `https://tiktok.com/@${profile.tiktok}`, label: 'TikTok', Icon: SiTiktok, external: true },
    profile.email && { href: `mailto:${profile.email}`, label: 'Email', Icon: FiMail },
    profile.instagram && { href: `https://instagram.com/${profile.instagram}`, label: 'Instagram', Icon: SiInstagram, external: true },
    wa && { href: wa, label: 'WhatsApp', Icon: SiWhatsapp, external: true },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <section className="py-14 md:py-16 bg-yellow-500" aria-label="Media sosial dan kontak">
      <Reveal className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-ink-900">Temukan Kami di</h2>
        <ul className="mt-6 flex items-center justify-center gap-3">
          {items.map(({ href, label, Icon, external }) => (
            <li key={label}>
              <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={tileCls} aria-label={label}>
                <Icon />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm sm:text-base text-ink-900/80 max-w-md mx-auto">
          Ikuti kami untuk melihat keseruan event dan hasil photobooth.
        </p>
      </Reveal>
    </section>
  );
}

export default FindUs;

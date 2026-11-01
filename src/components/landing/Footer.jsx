import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiMail, FiMapPin } from 'react-icons/fi';
import { SiInstagram, SiTiktok, SiWhatsapp } from 'react-icons/si';
import { waUrl } from '@/lib/siteProfile';

const MENU = [
  { label: 'Beranda', href: '/#beranda' },
  { label: 'Cek Jadwal', href: '/jadwal' },
  { label: 'Galeri', href: '/#galeri' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Kontak', href: '/#kontak' },
];

const colTitle = 'text-xs font-bold uppercase tracking-[0.16em] text-ink-500';
const linkCls = 'inline-flex items-center min-h-9 text-sm text-ink-700 hover:text-ink-900 transition-colors';
const socialCls =
  'size-11 flex items-center justify-center rounded-full border border-line text-ink-900 hover:bg-yellow-500 hover:border-yellow-500 transition-colors';

/** Semua data kontak berasal dari profil admin; kolom yang kosong tidak ditampilkan. */
export function Footer({ packages = [], profile }) {
  const wa = waUrl(profile);

  return (
    <footer className="bg-white border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="relative w-40 h-11">
            <Image src="/logo.png" alt="MemoriBox" fill sizes="160px" className="object-contain object-left" />
          </div>
          <p className="mt-4 text-sm text-ink-700 leading-relaxed max-w-xs">
            Sewa photobooth dan photobox untuk pernikahan, wisuda, dan acara perusahaan.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className={socialCls} aria-label="Instagram">
                <SiInstagram />
              </a>
            )}
            {profile.tiktok && (
              <a href={`https://tiktok.com/@${profile.tiktok}`} target="_blank" rel="noreferrer" className={socialCls} aria-label="TikTok">
                <SiTiktok />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className={socialCls} aria-label="WhatsApp">
                <SiWhatsapp />
              </a>
            )}
          </div>
        </div>

        <nav className="lg:col-span-2" aria-label="Menu footer">
          <p className={colTitle}>Menu</p>
          <ul className="mt-3">
            {MENU.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="lg:col-span-3" aria-label="Paket footer">
          <p className={colTitle}>Paket</p>
          <ul className="mt-3">
            {packages.map((p) => (
              <li key={p.id}>
                <Link href={`/paket/${p.id}`} className={linkCls}>
                  {p.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/kalkulator" className={linkCls}>
                Kalkulator Paket
              </Link>
            </li>
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <p className={colTitle}>Kontak</p>
          <ul className="mt-3 space-y-3 text-sm text-ink-700">
            {profile.address && (
              <li className="flex items-start gap-2.5">
                <FiMapPin className="mt-0.5 shrink-0 text-ink-500" />
                <span>{profile.address}</span>
              </li>
            )}
            {(profile.phoneDisplay || wa) && (
              <li className="flex items-start gap-2.5">
                <SiWhatsapp className="mt-0.5 shrink-0 text-ink-500" />
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className="hover:text-ink-900">
                    {profile.phoneDisplay || `+${profile.whatsapp}`}
                  </a>
                ) : (
                  <span>{profile.phoneDisplay}</span>
                )}
              </li>
            )}
            {profile.email && (
              <li className="flex items-start gap-2.5">
                <FiMail className="mt-0.5 shrink-0 text-ink-500" />
                <a href={`mailto:${profile.email}`} className="hover:text-ink-900 break-all">
                  {profile.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-500">
          <p>© {new Date().getFullYear()} MemoriBox.id. Hak cipta dilindungi.</p>
          {profile.area && <p>Melayani {profile.area}</p>}
        </div>
      </div>
    </footer>
  );
}

export default Footer;

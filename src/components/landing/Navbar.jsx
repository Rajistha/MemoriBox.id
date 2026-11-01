'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiMenu, FiX, FiChevronDown } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useWhatsApp } from './SiteProfileContext';
import WhatsAppModal from './WhatsAppModal';

// Tautan memakai jalur absolut ("/#...") agar berfungsi juga dari halaman paket dan jadwal.
export function Navbar({ packages = [], showGallery = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pkgOpen, setPkgOpen] = useState(false);
  const pkgRef = useRef(null);
  const { openWhatsApp } = useWhatsApp();

  const pkgItems = [
    ...packages.map((p) => ({ label: p.label, href: `/paket/${p.id}` })),
    { label: 'Kalkulator Paket', href: '/kalkulator' },
  ];

  const links = [
    { label: 'Beranda', href: '/#beranda' },
    { label: 'Paket', children: pkgItems },
    { label: 'Cek Jadwal', href: '/jadwal' },
    ...(showGallery ? [{ label: 'Galeri', href: '/#galeri' }] : []),
  ];

  // Tutup dropdown saat klik di luar atau menekan Esc; tutup drawer dengan Esc.
  useEffect(() => {
    if (!pkgOpen && !menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPkgOpen(false);
        setMenuOpen(false);
      }
    };
    const onDown = (e) => {
      if (pkgOpen && pkgRef.current && !pkgRef.current.contains(e.target)) setPkgOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [pkgOpen, menuOpen]);

  const handleContact = () => {
    setMenuOpen(false);
    openWhatsApp(<WhatsAppModal defaultMessage="Halo Memoribox, saya ingin berkonsultasi tentang photobooth untuk acara saya." />);
  };

  const linkCls =
    "relative text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-yellow-500 after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100";

  return (
    <header className="fixed top-3 inset-x-0 z-40 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 rounded-3xl bg-surface border border-line shadow-float flex items-center justify-between gap-6">
        <Link href="/" className="relative block w-32 h-9 shrink-0" aria-label="Memoribox beranda">
          <Image src="/logo.png" alt="Memoribox" fill priority sizes="128px" className="object-contain object-left" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Navigasi utama">
          {links.map((l) =>
            l.children ? (
              <div
                key={l.label}
                ref={pkgRef}
                className="relative"
                onMouseEnter={() => setPkgOpen(true)}
                onMouseLeave={() => setPkgOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setPkgOpen((v) => !v)}
                  aria-expanded={pkgOpen}
                  aria-haspopup="menu"
                  className={`${linkCls} inline-flex items-center gap-1 min-h-11 ${pkgOpen ? 'text-ink-900 after:scale-x-100' : ''}`}
                >
                  {l.label}
                  <FiChevronDown className={`transition-transform ${pkgOpen ? 'rotate-180' : ''}`} />
                </button>
                {pkgOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2">
                    <div role="menu" className="w-60 rounded-2xl bg-surface border border-line shadow-float p-2">
                      {l.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          role="menuitem"
                          onClick={() => setPkgOpen(false)}
                          className="flex items-center min-h-11 px-3 rounded-xl text-sm font-medium text-ink-900 hover:bg-yellow-50"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link key={l.href} href={l.href} className={linkCls}>
                {l.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" pill onClick={handleContact} className="hidden sm:inline-flex">
            Hubungi Kami
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden size-11 -mr-2 flex items-center justify-center rounded-xl text-ink-900 hover:bg-yellow-50"
            aria-label="Buka menu"
            aria-expanded={menuOpen}
          >
            <FiMenu className="text-2xl" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-surface border-l border-line flex flex-col p-5">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <span className="font-heading font-bold text-ink-900">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="size-11 -mr-2 flex items-center justify-center rounded-xl text-ink-700 hover:bg-yellow-50"
                aria-label="Tutup menu"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <nav className="flex flex-col py-3 flex-1 overflow-y-auto" aria-label="Navigasi seluler">
              {links.map((l) =>
                l.children ? (
                  <div key={l.label} className="border-b border-line/60 py-1">
                    <p className="px-2 min-h-11 flex items-center text-xs font-bold uppercase tracking-wider text-ink-500">{l.label}</p>
                    {l.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setMenuOpen(false)}
                        className="pl-5 pr-2 min-h-11 flex items-center text-base font-semibold text-ink-900"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-2 min-h-12 flex items-center text-base font-semibold text-ink-900 border-b border-line/60"
                  >
                    {l.label}
                  </Link>
                )
              )}
            </nav>
            <Button variant="primary" size="md" pill onClick={handleContact} className="w-full">
              Hubungi Kami
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;

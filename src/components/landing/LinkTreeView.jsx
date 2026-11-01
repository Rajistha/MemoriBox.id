'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  FiArrowRight, FiCalendar, FiCamera, FiCheck, FiChevronDown, FiCopy, FiExternalLink, FiGlobe, FiGrid,
  FiImage, FiShare2, FiStar, FiTag, FiX,
} from 'react-icons/fi';
import { SiInstagram, SiTiktok, SiWhatsapp } from 'react-icons/si';
import { useModal } from '@/components/ui/ModalProvider';
import { safeUrl } from '@/lib/appUrls';
import { siteUrl, isLocalHost } from '@/lib/domains';

const ICONS = {
  camera: FiCamera, calendar: FiCalendar, image: FiImage, ticket: FiTag,
  star: FiStar, globe: FiGlobe, whatsapp: SiWhatsapp, link: FiExternalLink,
};

// Di link.memoribox.id, jalur relatif ("/jadwal", "/paket/limited") menuju situs utama.
const resolveHref = (url) => {
  const safe = safeUrl(url);
  return safe.startsWith('/') && !isLocalHost() ? siteUrl('', safe) : safe;
};

// keepalive agar hitungan klik tetap terkirim walau halaman langsung berpindah.
const trackClick = (linkId) => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key || !linkId) return;
  try {
    fetch(`${base}/rest/v1/rpc/track_link_click`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_link_id: String(linkId) }),
    }).catch(() => {});
  } catch {
    // pelacakan bersifat opsional
  }
};

function LinkCard({ item }) {
  const href = resolveHref(item.url);
  const external = /^https?:/i.test(href);
  const Icon = ICONS[item.icon] || FiExternalLink;
  const featured = Boolean(item.isHighlighted);
  const newTab = item.openNewTab !== false || external;

  return (
    <a
      href={href}
      target={newTab ? '_blank' : '_self'}
      rel="noopener noreferrer"
      onClick={() => trackClick(item.id)}
      className={`group flex items-center gap-3.5 rounded-2xl p-3.5 min-h-16 border transition-colors ${
        featured
          ? 'bg-yellow-500 border-yellow-500 text-ink-900 hover:bg-yellow-600'
          : 'bg-surface border-line text-ink-900 hover:border-yellow-500'
      }`}
    >
      <span className={`size-11 shrink-0 rounded-xl flex items-center justify-center overflow-hidden ${featured ? 'bg-white/70' : 'bg-yellow-100 text-yellow-800'}`}>
        {item.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.logoUrl} alt="" loading="lazy" width="44" height="44" className="w-full h-full object-contain p-1.5" />
        ) : (
          <Icon size={19} aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-[15px] leading-snug truncate">{item.title}</span>
          {item.badge && (
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${featured ? 'bg-white text-ink-900' : 'bg-yellow-100 text-yellow-800'}`}>
              {item.badge}
            </span>
          )}
        </span>
        {item.subtitle && <span className={`block text-sm leading-snug mt-0.5 truncate ${featured ? 'text-ink-900/80' : 'text-ink-500'}`}>{item.subtitle}</span>}
      </span>

      {external ? <FiExternalLink size={16} aria-hidden="true" className="shrink-0 opacity-70" /> : <FiArrowRight size={16} aria-hidden="true" className="shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />}
      {newTab && <span className="sr-only">(membuka tab baru)</span>}
    </a>
  );
}

function QrModal({ url, onClose }) {
  const [src, setSrc] = useState('');
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard tidak tersedia
    }
  };
  React.useEffect(() => {
    let ignore = false;
    import('qrcode')
      .then((QR) => QR.toDataURL(url, { margin: 1, width: 260 }))
      .then((data) => !ignore && setSrc(data))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [url]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-lg text-ink-900">QR code halaman ini</h3>
        <button type="button" onClick={() => onClose()} className="size-11 -mr-2 flex items-center justify-center rounded-xl text-ink-700 hover:bg-yellow-50" aria-label="Tutup">
          <FiX className="text-xl" />
        </button>
      </div>
      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-2xl border border-line size-56 flex items-center justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`QR code ${url}`} width="208" height="208" />
          ) : (
            <span className="text-sm text-ink-500">Memuat…</span>
          )}
        </div>
      </div>
      <p className="text-center text-sm text-ink-500 break-all">{url}</p>
      <button
        type="button"
        onClick={copyLink}
        className="h-12 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-yellow-600 transition-colors"
      >
        {copied ? <FiCheck /> : <FiCopy />}
        <span aria-live="polite">{copied ? 'Tersalin' : 'Salin link'}</span>
      </button>
    </div>
  );
}

export function LinkTreeView({ profile, links }) {
  const { open } = useModal();
  const [openSections, setOpenSections] = useState({});
  const [copied, setCopied] = useState(false);

  const sections = useMemo(() => {
    const groups = [];
    let current = null;
    links
      .filter((l) => l.isActive !== false)
      .forEach((item) => {
        if (item.type === 'header') {
          current = { header: item, links: [] };
          groups.push(current);
        } else {
          if (!current) {
            current = { header: null, links: [] };
            groups.push(current);
          }
          current.links.push(item);
        }
      });
    return groups;
  }, [links]);

  const isOpen = (h) => openSections[h.id] ?? h.defaultOpen !== false;
  const shareUrl = () => (isLocalHost() ? window.location.href : siteUrl('link'));

  const share = async () => {
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.name, text: profile.bio, url });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard tidak tersedia
    }
  };

  const socials = (profile.socials || []).filter((s) => s.url?.trim());
  const concierge = profile.concierge || {};
  const pill = 'inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-ink-900 bg-surface border border-line hover:bg-yellow-50 transition-colors';

  return (
    <div className="min-h-screen bg-white text-ink-900 flex flex-col">
      <header className="w-full max-w-md mx-auto px-5 pt-5 flex items-center justify-end gap-2">
        <button type="button" onClick={() => open((close) => <QrModal url={shareUrl()} onClose={close} />, { size: 'sm' })} className={pill} aria-label="Tampilkan QR code">
          <FiGrid size={15} /> QR
        </button>
        <button type="button" onClick={share} className={pill}>
          {copied ? <FiCheck size={15} className="text-success" /> : <FiShare2 size={15} />}
          <span aria-live="polite">{copied ? 'Tersalin' : 'Bagikan'}</span>
        </button>
      </header>

      <main className="w-full max-w-md mx-auto px-5 pt-4 pb-8 flex-1">
        <section className="flex flex-col items-center text-center mb-8">
          <div className="relative w-48 h-16 mb-4">
            <Image src={profile.avatarUrl || '/logo.png'} alt={profile.name} fill sizes="192px" className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">{profile.name}</h1>
          {profile.handle && <p className="text-sm text-ink-500 mt-0.5">{profile.handle}</p>}
          {profile.bio && <p className="text-[15px] text-ink-700 mt-3 max-w-xs leading-relaxed">{profile.bio}</p>}

          {socials.length > 0 && (
            <div className="flex items-center justify-center gap-2.5 mt-5">
              {socials.map((s) => (
                <a
                  key={s.platform}
                  href={resolveHref(s.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label || s.platform}
                  className="size-11 rounded-full bg-surface hover:bg-yellow-500 border border-line hover:border-yellow-500 text-ink-900 flex items-center justify-center transition-colors"
                >
                  {s.platform === 'instagram' && <SiInstagram size={17} />}
                  {s.platform === 'tiktok' && <SiTiktok size={16} />}
                  {s.platform === 'whatsapp' && <SiWhatsapp size={17} />}
                  {s.platform === 'website' && <FiGlobe size={17} />}
                </a>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          {sections.length === 0 ? (
            <p className="text-center text-sm text-ink-500 py-10">Belum ada tautan aktif.</p>
          ) : (
            sections.map((group, i) => {
              if (!group.header) {
                return (
                  <div key={`g-${i}`} className="space-y-2.5">
                    {group.links.map((l) => <LinkCard key={l.id} item={l} />)}
                  </div>
                );
              }
              const dropdown = group.header.sectionType === 'dropdown';
              const expanded = dropdown ? isOpen(group.header) : true;
              const panelId = `sec-${group.header.id}`;
              return (
                <section key={group.header.id}>
                  {dropdown ? (
                    <button
                      type="button"
                      onClick={() => setOpenSections((prev) => ({ ...prev, [group.header.id]: !isOpen(group.header) }))}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      className="w-full flex items-center gap-3 min-h-11 text-left"
                    >
                      <span className="text-sm font-bold text-ink-700">{group.header.title}</span>
                      <span className="h-px flex-1 bg-line" />
                      <FiChevronDown size={16} aria-hidden="true" className={`text-ink-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 min-h-11">
                      <h2 className="text-sm font-bold text-ink-700">{group.header.title}</h2>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <div id={panelId} className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden" inert={!expanded}>
                      <div className="space-y-2.5 pt-2">
                        {group.links.length === 0 ? (
                          <p className="text-sm text-ink-500 py-3 text-center">Belum ada tautan di bagian ini.</p>
                        ) : (
                          group.links.map((l) => <LinkCard key={l.id} item={l} />)
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>

        {concierge.show !== false && concierge.buttonUrl && (
          <section className="mt-8 rounded-3xl bg-yellow-500 p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold">{concierge.title}</h2>
              {concierge.subtitle && <p className="text-sm text-ink-900/80 mt-0.5 leading-snug">{concierge.subtitle}</p>}
            </div>
            <a
              href={resolveHref(concierge.buttonUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-white text-ink-900 hover:bg-yellow-50 text-sm font-bold transition-colors"
            >
              {concierge.buttonText || 'Hubungi'} <FiArrowRight size={14} aria-hidden="true" />
            </a>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-sm text-ink-500">
        <a href={siteUrl('')} className="hover:text-ink-900 transition-colors">memoribox.id</a>
      </footer>
    </div>
  );
}

export default LinkTreeView;

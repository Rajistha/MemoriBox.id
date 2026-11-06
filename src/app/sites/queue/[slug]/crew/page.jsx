'use client';

import React, { useState, use } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { FiExternalLink, FiShare2, FiCopy, FiGrid } from 'react-icons/fi';
import { formatDate, queueDisplayUrl, queueQrUrl, queueGuestUrl, tokenFromSlug } from '@/lib/appUrls';
import Modal from '@/components/ui/Modal';
import QueueConsole from '@/components/queue/QueueConsole';

const headerBtn =
  'shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-line bg-white hover:bg-bg text-xs font-bold text-ink-700 cursor-pointer shadow-2xs';

export default function QueueCrewPage({ params }) {
  const unwrappedParams = use(params);
  const token = tokenFromSlug(unwrappedParams.slug);

  const [event, setEvent] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const guestUrl = queueGuestUrl(event);
  const displayUrl = queueDisplayUrl(event);
  const qrPageUrl = queueQrUrl(event);

  return (
    <div className="min-h-screen bg-bg text-ink-900 font-sans">
      <title>Kru Antrean - MemoriBox.id</title>
      <Toaster position="top-center" />

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-extrabold text-ink-900 text-sm sm:text-base leading-tight truncate">
              {event?.name || 'Terminal Kru Antrean'}
            </h1>
            <p className="text-xs text-ink-500">{formatDate(event?.date)}</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto shrink-0">
            {guestUrl && (
              <button type="button" onClick={() => setShareOpen(true)} className={headerBtn} aria-label="Bagikan">
                <FiShare2 size={14} />
                <span className="hidden sm:inline">Bagikan</span>
              </button>
            )}
            {qrPageUrl && (
              <a href={qrPageUrl} target="_blank" rel="noopener noreferrer" className={headerBtn} aria-label="QR Kios">
                <FiGrid size={14} />
                <span className="hidden sm:inline">QR Kios</span>
              </a>
            )}
            {displayUrl && (
              <a href={displayUrl} target="_blank" rel="noopener noreferrer" className={headerBtn} aria-label="Layar TV">
                <FiExternalLink size={14} />
                <span className="hidden sm:inline">Layar TV</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <QueueConsole token={token} onEvent={setEvent} />
      </main>

      {shareOpen && event && (
        <Modal
          title="Tampilan Antrean & QR"
          description={event.name}
          onClose={() => setShareOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="min-h-11 px-4 rounded-xl border border-line text-ink-700 text-xs font-bold hover:bg-bg cursor-pointer"
            >
              Tutup
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border border-line hover:border-yellow-500 bg-white hover:bg-yellow-50 transition-all flex flex-col items-center text-center gap-2"
              >
                <FiExternalLink size={20} className="text-yellow-800" />
                <span className="text-xs font-bold text-ink-900">Buka Layar TV</span>
                <span className="text-[11px] text-ink-500">Papan nomor + QR untuk TV booth</span>
              </a>
              <a
                href={qrPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border border-line hover:border-yellow-500 bg-white hover:bg-yellow-50 transition-all flex flex-col items-center text-center gap-2"
              >
                <FiGrid size={20} className="text-yellow-800" />
                <span className="text-xs font-bold text-ink-900">Halaman QR Tamu</span>
                <span className="text-[11px] text-ink-500">Kios tablet meja booth</span>
              </a>
            </div>
            <div className="pt-2 border-t border-line flex items-center justify-between gap-3">
              <span className="text-xs text-ink-500 truncate">{guestUrl}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(guestUrl);
                    toast.success('Link antrean disalin');
                  } catch {
                    toast.error('Gagal menyalin link');
                  }
                }}
                className="shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 text-xs font-bold cursor-pointer"
              >
                <FiCopy size={13} /> Salin link
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

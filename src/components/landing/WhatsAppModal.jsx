'use client';

import React, { useState } from 'react';
import { FiX, FiCopy, FiCheck } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { openExternal } from '@/lib/openExternal';
import { toWaNumber } from '@/lib/siteProfile';
import Button from '@/components/ui/Button';

/** Pratinjau pesan WhatsApp. Nomor tujuan berasal dari profil admin (prop `phone`); tanpa nomor, tombol dinonaktifkan. */
export function WhatsAppModal({
  title = 'Hubungi Tim MemoriBox',
  defaultMessage = 'Halo MemoriBox, saya ingin bertanya tentang photobooth untuk acara saya.',
  phone = '',
  onClose,
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);
  const number = toWaNumber(phone);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  const handleOpenWhatsApp = () => {
    openExternal(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
    if (onClose) onClose(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center">
            <SiWhatsapp className="text-xl" />
          </div>
          <h3 className="font-heading font-bold text-lg text-ink-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onClose && onClose(false)}
          className="size-11 -mr-2 flex items-center justify-center text-ink-500 hover:text-ink-900 rounded-lg hover:bg-yellow-50"
          aria-label="Tutup"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wa-message" className="text-xs font-bold text-ink-700">Pesan yang akan dikirim:</label>
        <textarea
          id="wa-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 rounded-xl border border-line bg-yellow-50/30 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition leading-relaxed resize-none"
        />
        {!number && <p className="text-xs text-danger font-medium">Nomor WhatsApp belum diatur. Salin teks lalu kirim manual.</p>}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-1">
        <Button variant="secondary" size="sm" icon={copied ? FiCheck : FiCopy} onClick={handleCopy}>
          {copied ? 'Tersalin!' : 'Salin Teks'}
        </Button>
        <Button variant="primary" size="sm" icon={SiWhatsapp} onClick={handleOpenWhatsApp} disabled={!number}>
          Buka WhatsApp
        </Button>
      </div>
    </div>
  );
}

export default WhatsAppModal;

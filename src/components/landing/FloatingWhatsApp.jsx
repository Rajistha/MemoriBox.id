'use client';

import React, { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { useWhatsApp } from './SiteProfileContext';
import WhatsAppModal from './WhatsAppModal';

export function FloatingWhatsApp() {
  const { openWhatsApp } = useWhatsApp();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-30 flex flex-col items-center gap-3">
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="size-12 rounded-full bg-surface border border-line text-ink-900 shadow-float flex items-center justify-center hover:bg-yellow-50 transition"
          aria-label="Kembali ke atas"
        >
          <FiArrowUp className="text-lg" />
        </button>
      )}
      <button
        type="button"
        onClick={() => openWhatsApp(<WhatsAppModal />)}
        className="size-14 rounded-full bg-yellow-500 text-ink-900 shadow-float flex items-center justify-center hover:bg-yellow-600 active:scale-95 transition"
        aria-label="Chat WhatsApp Memoribox"
      >
        <SiWhatsapp className="text-2xl" />
      </button>
    </div>
  );
}

export default FloatingWhatsApp;

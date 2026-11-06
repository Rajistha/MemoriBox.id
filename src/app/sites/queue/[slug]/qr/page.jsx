'use client';

import React, { use, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { queueGuestUrl } from '@/lib/appUrls';
import Image from 'next/image';
import { FiCamera, FiSmartphone, FiArrowRight } from 'react-icons/fi';

export default function KioskQRPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const [qrImageUrl, setQrImageUrl] = useState('');

  // QR dibuat di perangkat ke tautan tiket tamu yang benar (subdomain queue, atau /queue di localhost).
  useEffect(() => {
    const url = queueGuestUrl(slug);
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    let ignore = false;
    QRCode.toDataURL(full, { width: 480, margin: 2, color: { dark: '#1C1700', light: '#ffffff' } })
      .then((dataUrl) => {
        if (!ignore) setQrImageUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-bg text-ink-900 flex flex-col items-center justify-between p-6 sm:p-10 text-center">
      <title>QR Antrean - MemoriBox.id</title>
      {/* Brand Header */}
      <header className="flex flex-col items-center gap-2">
        <div className="relative w-44 h-12">
          <Image src="/logo.png" alt="Memoribox" fill priority className="object-contain" />
        </div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-800 bg-yellow-100 px-3.5 py-1 rounded-full border border-yellow-300">
          Kios Registrasi Antrian
        </span>
      </header>

      {/* Center QR Display Card */}
      <main className="my-auto max-w-sm w-full bg-surface rounded-3xl p-8 border-2 border-yellow-500 shadow-float flex flex-col items-center gap-5">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-ink-900">
            Scan & Dapatkan Tiket
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Gunakan kamera ponsel untuk mengambil antrian digital Anda.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-line bg-white p-3 shadow-inner">
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrImageUrl} alt="QR Code untuk mengambil nomor antrean" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="size-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* 3 Step Instruction */}
        <div className="w-full flex items-center justify-between text-[11px] font-bold text-ink-700 bg-yellow-50 p-3 rounded-xl border border-yellow-200">
          <div className="flex items-center gap-1.5">
            <FiCamera className="text-yellow-700 text-sm" />
            <span>1. Buka Kamera</span>
          </div>
          <FiArrowRight className="text-ink-300" />
          <div className="flex items-center gap-1.5">
            <FiSmartphone className="text-yellow-700 text-sm" />
            <span>2. Scan QR</span>
          </div>
          <FiArrowRight className="text-ink-300" />
          <span>3. Ambil Tiket</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-xs text-ink-500">
        Memoribox Smart Queue System
      </footer>
    </div>
  );
}

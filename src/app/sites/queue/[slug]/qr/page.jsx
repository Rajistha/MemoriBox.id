'use client';

import React, { use } from 'react';
import Image from 'next/image';
import { FiCamera, FiSmartphone, FiArrowRight } from 'react-icons/fi';

export default function KioskQRPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const targetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/queue/${slug}`
    : `https://queue.memoribox.id/${slug}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    targetUrl
  )}&margin=15&color=1C1700`;

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR Code Antrian Event ${slug}`}
            className="w-full h-full object-contain"
          />
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
        Memoribox Smart Queue System • Event: <strong>{slug}</strong>
      </footer>
    </div>
  );
}

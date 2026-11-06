'use client';

import React from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

// Keadaan galat standar untuk daftar/halaman data: pesan jelas + tombol coba lagi.
export default function ErrorState({ title = 'Gagal memuat data', message = 'Periksa koneksi internet lalu coba lagi.', onRetry, className = '' }) {
  return (
    <div role="alert" className={`bg-white border border-line rounded-2xl p-8 sm:p-10 text-center ${className}`}>
      <div className="size-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
        <FiAlertCircle size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-ink-900">{title}</p>
      <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-11 px-4 inline-flex items-center gap-2 rounded-xl border border-line bg-white hover:bg-bg text-xs font-bold text-ink-700 cursor-pointer"
        >
          <FiRefreshCw size={14} />
          <span>Coba lagi</span>
        </button>
      )}
    </div>
  );
}

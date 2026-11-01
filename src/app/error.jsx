'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Batas galat global: pengguna melihat pesan singkat dan bisa mencoba lagi, bukan layar kosong. */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-white text-ink-900 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink-500">Terjadi kesalahan</p>
      <h1 className="mt-3 font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Halaman gagal dimuat</h1>
      <span className="block w-12 h-1 bg-yellow-500 mt-4 rounded-full" aria-hidden="true" />
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="h-12 px-7 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm hover:bg-yellow-600 transition-colors"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-12 px-7 rounded-full border border-ink-300 text-ink-900 font-bold text-sm hover:bg-gray-50 transition-colors"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  );
}

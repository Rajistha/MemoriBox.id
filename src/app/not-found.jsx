import Link from 'next/link';
import Image from 'next/image';

export const metadata = { title: 'Halaman tidak ditemukan - MemoriBox.id' };

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-ink-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="relative w-40 h-11">
        <Image src="/logo.png" alt="MemoriBox" fill sizes="160px" className="object-contain" priority />
      </div>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.18em] text-ink-500">Error 404</p>
      <h1 className="mt-3 font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Halaman tidak ditemukan</h1>
      <span className="block w-12 h-1 bg-yellow-500 mt-4 rounded-full" aria-hidden="true" />
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center h-12 px-7 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm hover:bg-yellow-600 transition-colors"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';
import SiteShell from '@/components/landing/SiteShell';
import PackagePrices from '@/components/landing/PackagePrices';
import { getPackages, getSiteProfile } from '@/lib/publicData';
import { DEFAULT_PACKAGES, DEFAULT_TNC, formatRupiah, startFrom } from '@/lib/pricelistDefaults';

export const revalidate = 300;

export function generateStaticParams() {
  return DEFAULT_PACKAGES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const pkg = (await getPackages()).find((p) => p.id === id);
  if (!pkg) return { title: 'Paket tidak ditemukan' };

  const title = `${pkg.label} – Sewa Photobooth`;
  const description = `${pkg.tagline ? `${pkg.tagline} ` : ''}Mulai dari ${formatRupiah(startFrom(pkg))}. Tersedia di Jabodetabek & Bali.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://memoribox.id/paket/${id}`,
    },
    openGraph: {
      title: `${title} | MemoriBox.id`,
      description,
      url: `https://memoribox.id/paket/${id}`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${pkg.label} – MemoriBox`,
        },
      ],
    },
    twitter: {
      title: `${title} | MemoriBox.id`,
      description,
      images: ['/og-image.png'],
    },
  };
}

export default async function PackageDetailPage({ params }) {
  const { id } = await params;
  const [packages, profile] = await Promise.all([getPackages(), getSiteProfile()]);
  const pkg = packages.find((p) => p.id === id);
  if (!pkg) notFound();
  const terms = profile.terms.length > 0 ? profile.terms : DEFAULT_TNC;

  const others = packages.filter((p) => p.id !== pkg.id);

  return (
    <SiteShell>
      <section className="pt-28 md:pt-32 pb-16 md:pb-24 bg-gray-50 min-h-[80vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Link href="/#paket" className="inline-flex items-center gap-2 min-h-11 text-sm font-semibold text-ink-700 hover:text-ink-900">
            <FiArrowLeft /> Semua paket
          </Link>

          {/* Satu kartu: panel kuning (ringkasan) + daftar varian harga */}
          <div className="mt-4 grid lg:grid-cols-12 rounded-4xl overflow-hidden border border-line bg-surface shadow-card">
            <div className="lg:col-span-5 bg-yellow-500 text-ink-900 p-6 sm:p-10 flex flex-col">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-900/70">{pkg.badge || 'Paket sewa'}</p>
              <h1 className="mt-3 font-heading font-extrabold text-4xl tracking-tight leading-[1.1]">{pkg.label}</h1>
              {pkg.tagline && <p className="mt-3 text-base text-ink-900/80">{pkg.tagline}</p>}

              <div className="mt-6">
                <p className="text-sm font-semibold text-ink-900/70">Mulai dari</p>
                <p className="font-heading font-extrabold text-4xl">{formatRupiah(startFrom(pkg))}</p>
                {pkg.extraNote && <p className="mt-2 text-sm font-medium">{pkg.extraNote}</p>}
              </div>

              <ul className="mt-7 space-y-3">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 size-5 rounded-full bg-white flex items-center justify-center shrink-0">
                      <FiCheck className="text-[11px]" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/jadwal"
                className="mt-8 lg:mt-auto lg:pt-0 inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-white text-ink-900 font-bold text-sm hover:bg-yellow-50 transition-colors self-start"
              >
                Cek ketersediaan tanggal <FiArrowRight />
              </Link>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-10">
              <h2 className="font-heading font-extrabold text-2xl text-ink-900">Pilih varian</h2>
              <p className="text-sm text-ink-500 mt-1">Durasi dan kuota cetak</p>
              <div className="mt-5">
                <PackagePrices pkg={pkg} />
              </div>

              <details className="mt-6 rounded-2xl border border-line group">
                <summary className="cursor-pointer list-none px-5 min-h-12 flex items-center justify-between font-semibold text-sm text-ink-900">
                  Syarat &amp; ketentuan pemesanan
                  <span className="text-ink-500 text-xs group-open:hidden">Tampilkan</span>
                  <span className="text-ink-500 text-xs hidden group-open:inline">Sembunyikan</span>
                </summary>
                <ol className="px-5 pb-5 grid gap-y-2 text-sm text-ink-700 list-decimal list-inside">
                  {terms.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </details>
            </div>
          </div>

          {others.length > 0 && (
            <div className="mt-14">
              <h2 className="font-heading font-bold text-xl text-ink-900">Paket lainnya</h2>
              <ul className="mt-4 grid sm:grid-cols-2 gap-4">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/paket/${o.id}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card hover:border-yellow-500 transition-colors"
                    >
                      <div>
                        <p className="font-heading font-bold text-lg text-ink-900">{o.label}</p>
                        <p className="text-sm text-ink-500">Mulai dari {formatRupiah(startFrom(o))}</p>
                      </div>
                      <span className="size-11 rounded-full border border-ink-300 flex items-center justify-center text-ink-900 group-hover:bg-yellow-500 group-hover:border-yellow-500 transition-colors shrink-0">
                        <FiArrowRight />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

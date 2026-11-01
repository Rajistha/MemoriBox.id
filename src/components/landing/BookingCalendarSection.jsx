import React from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCalendar } from 'react-icons/fi';
import { formatDate } from '@/lib/utils';
import SectionHeader from './SectionHeader';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Ringkasan jadwal di beranda; kalender lengkap ada di halaman /jadwal. */
export function BookingCalendarSection({ events = [] }) {
  const next = events.slice(0, 3);

  return (
    <section id="jadwal" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Ketersediaan"
          title="Cek tanggal acara Anda."
        />

        <div className="mt-10 max-w-3xl mx-auto">
          {next.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-300 bg-surface px-5 py-6 text-center text-sm text-ink-700">
              Belum ada acara terjadwal. Semua tanggal masih tersedia.
            </p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-3">
              {next.map((ev) => {
                const d = new Date(`${ev.date}T00:00:00`);
                return (
                  <li key={ev.id} className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 shadow-card w-full sm:w-72">
                    <div className="size-14 shrink-0 rounded-xl bg-yellow-500 text-ink-900 flex flex-col items-center justify-center leading-none">
                      <span className="text-lg font-extrabold">{d.getDate()}</span>
                      <span className="text-[10px] font-bold uppercase mt-0.5">{MONTHS[d.getMonth()]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900 truncate">{ev.name}</p>
                      <p className="text-xs text-ink-500">{formatDate(ev.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex justify-center">
            <Link
              href="/jadwal"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm hover:bg-yellow-600 transition-colors"
            >
              <FiCalendar /> Buka kalender lengkap <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BookingCalendarSection;

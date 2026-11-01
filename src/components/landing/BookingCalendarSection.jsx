import React from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCalendar } from 'react-icons/fi';
import SectionHeader from './SectionHeader';

/** Ajakan cek jadwal di beranda; kalender lengkap ada di halaman /jadwal. */
export function BookingCalendarSection() {
  return (
    <section id="jadwal" className="py-16 md:py-24 border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Ketersediaan"
          title="Cek tanggal acara Anda."
        />

        <div className="mt-8">
          <div className="flex justify-center">
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

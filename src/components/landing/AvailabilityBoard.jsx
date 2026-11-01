'use client';

import React, { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { useModal } from '@/components/ui/ModalProvider';
import { useWhatsApp } from './SiteProfileContext';
import { formatDate } from '@/lib/utils';
import WhatsAppModal from './WhatsAppModal';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MIN_LEAD_DAYS = 7;
const PAGE_SIZE = 4;

const ymd = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Hanya tanggal terisi yang diberi warna; sisanya polos agar kalender mudah dipindai.
const CELL = {
  past: 'text-ink-300 cursor-default',
  available: 'text-ink-900 hover:bg-yellow-50',
  limited: 'text-ink-500 bg-gray-50 hover:bg-yellow-50',
  booked: 'bg-yellow-500 text-ink-900 font-extrabold hover:bg-yellow-600',
};

export function AvailabilityBoard({ events = [] }) {
  const { notify } = useModal();
  const { openWhatsApp } = useWhatsApp();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [page, setPage] = useState(1);

  const booked = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const pageEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());
  const leadLimit = new Date(today);
  leadLimit.setDate(leadLimit.getDate() + MIN_LEAD_DAYS);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const firstDay = new Date(cursor.y, cursor.m, 1).getDay();

  const statusOf = (d) => {
    const date = new Date(cursor.y, cursor.m, d);
    if (date < today) return 'past';
    if (booked.has(ymd(cursor.y, cursor.m, d))) return 'booked';
    if (date < leadLimit) return 'limited';
    return 'available';
  };

  const move = (delta) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const askBooking = (text, title) => openWhatsApp(<WhatsAppModal title={title} defaultMessage={text} />);

  const pick = (d) => {
    const status = statusOf(d);
    if (status === 'past') return;
    const label = formatDate(ymd(cursor.y, cursor.m, d));
    if (status === 'booked') {
      notify({ title: 'Tanggal sudah terisi', message: `${label} sudah dipesan klien lain. Silakan pilih tanggal lain.`, tone: 'info' });
      return;
    }
    askBooking(
      status === 'limited'
        ? `Halo Memoribox, saya ingin menanyakan slot untuk tanggal ${label} (kurang dari H-7). Apakah masih memungkinkan?`
        : `Halo Memoribox, saya ingin memesan photobooth untuk tanggal ${label}. Mohon info paket dan langkah selanjutnya.`,
      status === 'limited' ? 'Tanya slot mendadak' : 'Pesan tanggal ini'
    );
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const status = statusOf(d);
    const isToday = ymd(cursor.y, cursor.m, d) === todayKey;
    cells.push(
      <button
        key={d}
        type="button"
        disabled={status === 'past'}
        onClick={() => pick(d)}
        className={`aspect-square sm:aspect-4/3 rounded-xl text-sm flex flex-col items-center justify-center transition-colors ${CELL[status]} ${
          isToday ? 'ring-2 ring-ink-900 ring-inset' : ''
        }`}
        aria-label={`${d} ${MONTHS[cursor.m]} ${cursor.y}: ${
          { past: 'sudah lewat', booked: 'terisi', limited: 'kurang dari H-7', available: 'tersedia' }[status]
        }`}
        aria-current={isToday ? 'date' : undefined}
      >
        <span className="font-semibold">{d}</span>
        {status === 'booked' && <span className="hidden sm:block text-[10px] font-bold leading-none mt-0.5">Terisi</span>}
      </button>
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-stretch">
      {/* Daftar acara */}
      <section className="lg:col-span-5 rounded-3xl border border-line bg-surface shadow-card p-5 sm:p-6 flex flex-col">
        <h2 className="font-heading font-extrabold text-xl text-ink-900">Acara terjadwal</h2>

        {pageEvents.length === 0 ? (
          <p className="mt-5 flex-1 rounded-2xl border border-dashed border-ink-300 p-6 text-sm text-ink-700">
            Belum ada acara terjadwal. Semua tanggal masih tersedia.
          </p>
        ) : (
          <ul className="mt-4 flex-1 divide-y divide-line">
            {pageEvents.map((ev) => {
              const d = new Date(`${ev.date}T00:00:00`);
              return (
                <li key={ev.id} className="flex items-center gap-4 py-3.5">
                  <div className="size-14 shrink-0 rounded-xl bg-yellow-500 text-ink-900 flex flex-col items-center justify-center leading-none">
                    <span className="text-xl font-extrabold">{d.getDate()}</span>
                    <span className="text-[10px] font-bold uppercase mt-1">{MONTHS_SHORT[d.getMonth()]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{ev.name}</p>
                    <p className="text-sm text-ink-500">
                      {DAYS_LONG[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {events.length > PAGE_SIZE && (
          <div className="mt-2 pt-4 border-t border-line flex items-center justify-between">
            <span className="text-sm text-ink-500">
              {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="size-11 rounded-full border border-line flex items-center justify-center hover:bg-yellow-50 disabled:opacity-40"
                aria-label="Halaman sebelumnya"
              >
                <FiChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="size-11 rounded-full border border-line flex items-center justify-center hover:bg-yellow-50 disabled:opacity-40"
                aria-label="Halaman berikutnya"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => askBooking('Halo Memoribox, saya ingin memesan photobooth. Mohon info ketersediaan dan paketnya.', 'Booking via WhatsApp')}
          className="mt-5 h-12 rounded-full bg-yellow-500 text-ink-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-yellow-600 transition-colors"
        >
          <SiWhatsapp className="text-lg" /> Booking via WhatsApp
        </button>
      </section>

      {/* Kalender */}
      <section className="lg:col-span-7 rounded-3xl border border-line bg-surface shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-heading font-extrabold text-xl text-ink-900">
            {MONTHS[cursor.m]} {cursor.y}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              className="size-11 rounded-full border border-line flex items-center justify-center hover:bg-yellow-50"
              aria-label="Bulan sebelumnya"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="size-11 rounded-full border border-line flex items-center justify-center hover:bg-yellow-50"
              aria-label="Bulan berikutnya"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-bold text-ink-500 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>

        <ul className="mt-5 pt-4 border-t border-line flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-700">
          <li className="flex items-center gap-2"><span className="size-3 rounded bg-yellow-500" /> Terisi</li>
          <li className="flex items-center gap-2"><span className="size-3 rounded bg-gray-100 border border-line" /> Kurang dari H-7, tanya admin</li>
          <li className="flex items-center gap-2"><span className="size-3 rounded border-2 border-ink-900" /> Hari ini</li>
        </ul>
      </section>
    </div>
  );
}

export default AvailabilityBoard;

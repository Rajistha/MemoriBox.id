'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiTag,
  FiUser,
  FiLayers,
  FiX,
  FiWifiOff,
  FiRefreshCw,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { usePolling } from '@/lib/usePolling';

const REFRESH_MS = 4000;

const formatRp = (n) => {
  const num = Math.round(Number(n) || 0);
  const parts = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return num < 0 ? `-Rp ${parts}` : `Rp ${parts}`;
};

// Komponen angka berhitung halus saat nilai berubah
const AnimatedNumber = ({ value, format = (n) => String(n) }) => {
  const [display, setDisplay] = useState(value || 0);
  const fromRef = useRef(value || 0);

  useEffect(() => {
    const controls = animate(fromRef.current, value || 0, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => {
        fromRef.current = v;
        setDisplay(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);

  return <>{format(display)}</>;
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function LiveSessionPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;
  // Seluruh slug dikirim ke server: slug cantik atau tautan lama 'nama-token'.
  const token = slug;

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'notfound' | 'error'
  const [updatedAt, setUpdatedAt] = useState(null);

  // Acara dibaca lewat RPC get_live_event (hanya data yang boleh dilihat pelanggan, tanpa harga & print).
  // Galat jaringan dilempar (tampilan terakhir dipertahankan); data kosong berarti token tidak valid.
  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_live_event', { p_token: token });
      if (error) throw error;
      if (!data) {
        setEvent(null);
        setStatus('notfound');
        return;
      }
      setEvent(data);
      setStatus('ready');
      setUpdatedAt(new Date());
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      await load();
    };
    init();
  }, [load]);

  // Polling berhenti saat tab tersembunyi dan kembali segar begitu tab dibuka lagi.
  usePolling(load, REFRESH_MS, status !== 'notfound');

  const sessions = event?.sessions || [];
  const voucherCount = sessions.filter((s) => !s.no_voucher).length;
  const noVoucherCount = sessions.length - voucherCount;
  const percent = event?.pricing_mode === 'percent';
  // Nilai sharing dihitung server (sama dengan pembukuan kas); hitung lokal hanya cadangan untuk data lama.
  const sharing =
    event?.sharing_amount != null
      ? Number(event.sharing_amount)
      : voucherCount * (Number(event?.share_per_voucher) || 10000);

  // Kelompokkan sesi per tanggal, terbaru di atas
  const groups = [];
  [...sessions].reverse().forEach((s, idx) => {
    const dateStr = new Date(s.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    let g = groups[groups.length - 1];
    if (!g || g.date !== dateStr) {
      g = { date: dateStr, items: [] };
      groups.push(g);
    }
    g.items.push({ s, n: sessions.length - idx });
  });

  const stats = percent
    ? [
        {
          label: 'Total sesi',
          value: sessions.length,
          icon: <FiLayers size={14} />,
          tone: 'text-slate-900 bg-slate-100',
        },
        {
          label: 'Sharing (%)',
          value: Number(event?.share_percent || 0),
          icon: <FiTag size={14} />,
          tone: 'text-amber-700 bg-amber-50',
        },
      ]
    : [
        {
          label: 'Voucher',
          value: voucherCount,
          icon: <FiTag size={14} />,
          tone: 'text-amber-800 bg-yellow-100',
        },
        {
          label: 'Non-voucher',
          value: noVoucherCount,
          icon: <FiUser size={14} />,
          tone: 'text-slate-700 bg-slate-100',
        },
        {
          label: 'Total sesi',
          value: sessions.length,
          icon: <FiLayers size={14} />,
          tone: 'text-slate-900 bg-slate-100',
        },
      ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-12 font-sans">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat data sesi foto...</p>
          </div>
        )}

        {/* Not Found / Error State */}
        {(status === 'notfound' || status === 'error') && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
              <FiWifiOff size={24} />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900">
              Acara Tidak Ditemukan
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Tautan sesi live ini tidak aktif atau token tidak valid. Silakan hubungi kru operator Memoribox untuk mendapatkan tautan acara terbaru.
            </p>
          </div>
        )}

        {/* Ready State - Identik dengan SnapHub namun dengan UI Memoribox */}
        {status === 'ready' && event && (
          <div className="space-y-4 sm:space-y-5">
            {/* Top Bar */}
            <motion.div {...fadeUp(0)} className="flex items-center justify-between">
              <div className="relative w-32 h-8">
                <Image src="/logo.png" alt="Memoribox" fill sizes="128px" className="object-contain object-left" priority />
              </div>

              {/* Pulsing Live Badge */}
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-2xs">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-600" />
                </span>
                <span>LIVE</span>
                {updatedAt && (
                  <span className="font-mono text-emerald-600/80 text-[11px] tabular-nums">
                    {updatedAt.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </span>
            </motion.div>

            {/* Event Title */}
            <motion.div {...fadeUp(0.06)} className="pt-2">
              <span className="text-[10px] uppercase tracking-wider text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-md font-bold border border-yellow-300/80">
                Pencatatan Live
              </span>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 mt-2 leading-tight">
                {event.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
                <FiCalendar size={13} className="text-slate-400" />
                <span>
                  {event.date
                    ? new Date(`${event.date}T00:00:00`).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Tanpa tanggal'}
                </span>
              </p>
            </motion.div>

            {/* Sharing Hero Card - Sleek Amber/Gold Gradient */}
            <motion.div
              {...fadeUp(0.12)}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-500 text-slate-950 p-6 shadow-xs border border-yellow-300"
            >
              <div className="relative">
                <p className="text-[11px] uppercase tracking-wider text-slate-900/80 font-bold">
                  Estimasi sharing profit
                </p>
                <p className="text-4xl sm:text-5xl font-heading font-black text-slate-950 mt-2 tabular-nums tracking-tight">
                  <AnimatedNumber value={sharing} format={formatRp} />
                </p>
                <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1 rounded-full bg-slate-950/10 border border-slate-950/15 text-xs text-slate-900 font-semibold tabular-nums">
                  {percent ? (
                    `${Number(event.share_percent || 0)}% dari pemasukan sesi`
                  ) : (
                    <>
                      <span>{voucherCount} voucher</span>
                      <FiX size={11} />
                      <span>{formatRp(event.share_per_voucher || 10000)}</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              {...fadeUp(0.18)}
              className={`grid gap-2.5 ${stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
            >
              {stats.map((c) => (
                <div
                  key={c.label}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs"
                >
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg ${c.tone}`}>
                    {c.icon}
                  </span>
                  <p className="text-2xl font-heading font-black text-slate-900 mt-2.5 tabular-nums">
                    <AnimatedNumber value={c.value} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                    {c.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Voucher Ratio Bar */}
            {!percent && sessions.length > 0 && (
              <motion.div {...fadeUp(0.22)} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-yellow-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(voucherCount / sessions.length) * 100}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                  <span>Rasio Voucher</span>
                  <span className="font-bold text-slate-700">
                    {Math.round((voucherCount / sessions.length) * 100)}% sesi memakai voucher
                  </span>
                </div>
              </motion.div>
            )}

            {/* Session List Card */}
            <motion.div
              {...fadeUp(0.26)}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h2 className="text-sm font-heading font-extrabold text-slate-900">
                  Daftar Sesi
                </h2>
                <span className="text-xs text-slate-500 font-semibold tabular-nums">
                  {sessions.length} sesi tercatat
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-slate-400 font-medium">Belum ada sesi yang dicatat.</p>
                </div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
                  {groups.map((g) => (
                    <div key={g.date}>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2 px-1">
                        {g.date} · {g.items.length} sesi
                      </p>
                      <div className="divide-y divide-slate-100">
                        <AnimatePresence initial={false}>
                          {g.items.map(({ s, n }) => (
                            <motion.div
                              key={s.id}
                              initial={{ opacity: 0, x: -16, backgroundColor: 'rgba(254, 243, 199, 0.5)' }}
                              animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(254, 243, 199, 0)' }}
                              transition={{ duration: 0.4, backgroundColor: { duration: 1.2 } }}
                              className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-lg"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 tabular-nums font-mono">
                                  {n}
                                </span>
                                {!percent && (
                                  <span
                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                      s.no_voucher
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-yellow-100 text-yellow-900 border border-yellow-300/80'
                                    }`}
                                  >
                                    {s.no_voucher ? 'Non-voucher' : 'Voucher'}
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center gap-1.5 text-xs text-slate-500 tabular-nums font-mono">
                                <FiClock size={12} className="text-slate-400" />
                                <span>
                                  {new Date(s.created_at).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Auto refresh note */}
            <motion.p {...fadeUp(0.3)} className="text-center text-[11px] text-slate-400 pt-1 pb-4">
              Diperbarui otomatis setiap {REFRESH_MS / 1000} detik
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}

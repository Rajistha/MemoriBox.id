'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  FiTrash2,
  FiRefreshCw,
  FiPlay,
  FiCheck,
  FiSkipForward,
  FiVolume2,
  FiRotateCcw,
  FiCamera,
  FiPlus,
  FiSearch,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { usePolling } from '@/lib/usePolling';
import { playChime, unlockAudio } from '@/lib/chime';
import { isActive, statusMeta } from '@/lib/queueStatus';
import { formatRp } from '@/lib/appUrls';
import Modal from '@/components/ui/Modal';

const TABS = [
  { id: 'active', label: 'Antrean' },
  { id: 'completed', label: 'Selesai' },
  { id: 'all', label: 'Semua' },
];

const nextNumber = (queues) =>
  `A-${String((queues.reduce((max, q) => Math.max(max, q.seq_number || 0), 0) || 0) + 1).padStart(2, '0')}`;

/**
 * Konsol kontrol antrean (alur sama dengan SnapHub): kartu "Sedang dilayani", "Berikutnya", dan daftar antrean.
 * Dipakai bersama oleh terminal kru (tanpa login) dan panel admin. Semua aksi lewat RPC atomik crew_queue_*;
 * pencatatan sesi foto + pemasukan dilakukan oleh RPC itu sendiri, jadi klien tidak boleh menulis sesi lagi.
 */
export default function QueueConsole({ token, onEvent, onSessionsChanged }) {
  const [event, setEvent] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [tab, setTab] = useState('active');
  const [queueSearch, setQueueSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoSession, setAutoSession] = useState(true);

  const [nextChoiceOpen, setNextChoiceOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const onEventRef = useRef(onEvent);
  const onSessionsRef = useRef(onSessionsChanged);
  useEffect(() => {
    onEventRef.current = onEvent;
    onSessionsRef.current = onSessionsChanged;
  }, [onEvent, onSessionsChanged]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error } = await supabase.rpc('get_crew_queue_data', { p_token: token });
      if (!error && data) {
        setInvalid(false);
        setEvent(data.event);
        setQueues(data.queues || []);
        setLoading(false);
        onEventRef.current?.(data.event);
        return;
      }
    } catch {
      // jatuh ke penanganan "tidak ada data" di bawah
    }
    // Tanpa data dari server: jangan mengarang antrean. Bila belum pernah termuat, tautan dianggap tidak valid.
    setEvent((prev) => {
      if (!prev) setInvalid(true);
      return prev;
    });
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const init = async () => {
      await refresh();
    };
    init();
  }, [refresh]);

  // Cadangan bila realtime terputus. Realtime di bawah yang membuat tampilan terasa instan.
  usePolling(refresh, 5000, !invalid && !!token);

  useEffect(() => {
    const eventId = event?.id;
    if (!eventId || invalid || !supabase?.channel) return undefined;
    const channel = supabase
      .channel(`queue_console_rt_${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_queues', filter: `event_id=eq.${eventId}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, invalid, refresh]);

  const active = useMemo(() => queues.find(isActive) || null, [queues]);
  const waiting = useMemo(() => queues.filter((q) => q.status === 'waiting'), [queues]);
  const completedCount = useMemo(() => queues.filter((q) => q.status === 'completed').length, [queues]);

  const visibleQueues = useMemo(() => {
    const needle = queueSearch.trim().toLowerCase();
    return queues.filter((q) => {
      if (tab === 'active' && !(q.status === 'waiting' || isActive(q))) return false;
      if (tab === 'completed' && q.status !== 'completed') return false;
      if (!needle) return true;
      return (
        (q.customer_name || '').toLowerCase().includes(needle) ||
        (q.queue_number || '').toLowerCase().includes(needle) ||
        (q.customer_phone || '').includes(needle)
      );
    });
  }, [queues, tab, queueSearch]);

  // Satu pintu untuk semua aksi: mengunci tombol selama berjalan, melempar galat bila server menolak.
  const run = async (fn, errorMessage) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      toast.error(errorMessage || 'Gagal memproses aksi');
    } finally {
      setBusy(false);
    }
  };

  const rpc = async (name, args) => {
    const { data, error } = await supabase.rpc(name, { p_token: token, ...args });
    if (error) throw error;
    return data;
  };

  // Bila masih ada tamu aktif, tanyakan dulu nasibnya: selesai (sesi dicatat) atau dilewati (tidak datang).
  const requestCallNext = () => {
    if (busy) return;
    if (waiting.length === 0) {
      toast('Tidak ada tamu yang menunggu');
      return;
    }
    if (active) setNextChoiceOpen(true);
    else callNext('complete');
  };

  const callNext = (currentAction = 'complete') =>
    run(async () => {
      unlockAudio();
      const data = await rpc('crew_queue_call_next', {
        p_auto_session: autoSession,
        p_current_action: currentAction,
      });
      await refresh();
      if (!data) {
        toast('Tidak ada tamu yang menunggu');
        return;
      }
      if (currentAction === 'complete' && autoSession) onSessionsRef.current?.();
      playChime(0.8);
      toast.success(`Memanggil ${data.queue_number}`);
    }, 'Gagal memanggil antrean');

  const complete = (item) =>
    run(async () => {
      await rpc('crew_queue_complete', { p_id: item.id, p_auto_session: autoSession });
      await refresh();
      if (autoSession) onSessionsRef.current?.();
      toast.success(autoSession ? `${item.queue_number} selesai, sesi foto dicatat` : `${item.queue_number} selesai`);
    }, 'Gagal menyelesaikan antrean');

  const startServing = (item) =>
    run(async () => {
      await rpc('crew_queue_start', { p_id: item.id });
      setQueues((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'serving' } : q)));
      toast.success(`${item.queue_number} mulai difoto`);
    }, 'Gagal memulai sesi foto');

  const recall = (item) =>
    run(async () => {
      unlockAudio();
      await rpc('crew_queue_recall', { p_id: item.id });
      playChime(0.8);
      await refresh();
      toast.success(`Memanggil ulang ${item.queue_number}`);
    }, 'Gagal memanggil ulang');

  const skip = (item) =>
    run(async () => {
      await rpc('crew_queue_skip', { p_id: item.id });
      await refresh();
      toast.success(`${item.queue_number} dilewati`);
    }, 'Gagal melewati antrean');

  const requeue = (item) =>
    run(async () => {
      await rpc('crew_queue_requeue', { p_id: item.id });
      await refresh();
      toast.success(`${item.queue_number} kembali ke antrean`);
    }, 'Gagal mengembalikan antrean');

  const remove = (item) =>
    run(async () => {
      await rpc('crew_queue_remove', { p_id: item.id });
      setQueues((prev) => prev.filter((q) => q.id !== item.id));
      toast.success('Antrean dihapus');
    }, 'Gagal menghapus antrean');

  const queueOpen = event?.queue_open !== false;
  const toggleOpen = () =>
    run(async () => {
      const next = !queueOpen;
      await rpc('crew_queue_set_open', { p_open: next });
      setEvent((prev) => (prev ? { ...prev, queue_open: next } : prev));
      toast.success(next ? 'Antrean dibuka, tamu bisa mengambil nomor' : 'Antrean ditutup, tamu tidak bisa mengambil nomor');
    }, 'Gagal mengubah status antrean');

  const patchItem = async (item, patch, rpcArgs, errorMessage) => {
    setQueues((prev) => prev.map((q) => (q.id === item.id ? { ...q, ...patch } : q)));
    try {
      await rpc('crew_queue_update_item', { p_id: item.id, ...rpcArgs });
    } catch {
      toast.error(errorMessage);
      refresh();
    }
  };

  const changePrints = (item, delta) => {
    const next = Math.min(50, Math.max(0, (item.prints || 0) + delta));
    if (next === (item.prints || 0)) return;
    patchItem(item, { prints: next }, { p_prints: next }, 'Jumlah cetak tidak tersimpan');
  };

  const setNoVoucher = (item, value) => {
    if (!!item.no_voucher === value) return;
    patchItem(item, { no_voucher: value }, { p_no_voucher: value }, 'Status voucher tidak tersimpan');
  };

  // Tiket 1-tap tanpa nama/WA, nomornya dibuat server (atomik) sehingga tidak bisa ganda.
  const handleAddManual = async () => {
    setAddingGuest(true);
    try {
      const data = await rpc('crew_queue_add_manual', { p_name: '', p_phone: '' });
      toast.success(`Nomor ${data?.queue_number || ''} berhasil diterbitkan`);
      setAddOpen(false);
      await refresh();
    } catch (err) {
      toast.error('Gagal menambah antrean: ' + (err.message || 'Error'));
    } finally {
      setAddingGuest(false);
    }
  };

  const percentMode = event?.pricing_mode === 'percent';
  const priceOf = (item) => {
    const voucher = event?.voucher_price ?? 30000;
    const noVoucher = event?.no_voucher_price ?? 35000;
    const printPrice = event?.print_price ?? 10000;
    const base = percentMode ? (event?.session_price ?? 45000) : item.no_voucher ? noVoucher : voucher;
    const prints = item.prints || 0;
    return { base, printPrice, prints, total: base + prints * printPrice };
  };

  if (invalid) {
    return (
      <div className="bg-white border border-line rounded-2xl p-10 text-center">
        <h2 className="font-heading font-extrabold text-lg text-ink-900">Tautan kru tidak valid</h2>
        <p className="text-xs text-ink-500 mt-1">Token kru tidak ditemukan atau belum terdaftar di sistem.</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 min-h-11 px-4 rounded-xl border border-line bg-white text-xs font-bold text-ink-700 hover:bg-bg cursor-pointer"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (loading && !event) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" aria-busy="true">
        <div className="lg:col-span-3 h-64 rounded-3xl bg-white border border-line animate-pulse" />
        <div className="lg:col-span-2 h-64 rounded-3xl bg-white border border-line animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2 ${
          queueOpen ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-2 rounded-full shrink-0 ${queueOpen ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <p className="text-xs font-bold text-ink-900 truncate">
            {queueOpen ? 'Antrean dibuka' : 'Antrean ditutup'}
            <span className="font-medium text-ink-700 hidden sm:inline">
              {queueOpen ? ' · tamu bisa mengambil nomor' : ' · tamu tidak bisa mengambil nomor baru'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          disabled={busy}
          className="shrink-0 min-h-11 px-4 rounded-xl border border-line bg-white hover:bg-bg disabled:opacity-60 text-xs font-bold text-ink-900 cursor-pointer"
        >
          {queueOpen ? 'Tutup Antrean' : 'Buka Antrean'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sedang dilayani */}
        <section className="bg-white rounded-3xl border border-line p-5 sm:p-6 shadow-2xs lg:col-span-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Sedang Dilayani</h2>
            {active && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{statusMeta(active.status).label}</span>
              </span>
            )}
          </div>

          {active ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-5xl sm:text-6xl font-black tracking-tight text-ink-900 leading-none tabular-nums">
                    {active.queue_number}
                  </p>
                  <p className="text-xs text-ink-500 mt-2">Dipanggil {active.called_count || 1}×</p>
                </div>
                {(() => {
                  const price = priceOf(active);
                  return (
                    <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-right min-w-[7.5rem]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Total bayar</p>
                      <p className="text-xl sm:text-2xl font-black tabular-nums text-ink-900 leading-tight">
                        {formatRp(price.total)}
                      </p>
                      <p className="text-[10px] text-ink-500 leading-tight mt-0.5 tabular-nums">
                        {percentMode ? 'Sesi ' : ''}
                        {formatRp(price.base)}
                        {price.prints > 0 && ` + ${price.prints}×${formatRp(price.printPrice).replace('Rp ', '')}`}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {!percentMode && (
                  <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line p-1 bg-bg" role="group" aria-label="Voucher">
                    {[
                      { v: false, label: 'Pakai Voucher' },
                      { v: true, label: 'Tanpa Voucher' },
                    ].map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setNoVoucher(active, o.v)}
                        aria-pressed={!!active.no_voucher === o.v}
                        className={`rounded-xl min-h-11 px-2 text-xs font-bold transition-colors cursor-pointer ${
                          !!active.no_voucher === o.v
                            ? 'bg-yellow-500 text-ink-900 shadow-2xs'
                            : 'text-ink-700 hover:bg-yellow-50'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-line pl-3 pr-1 py-1 bg-bg">
                  <span className="text-xs text-ink-700 font-medium">Print Tambahan</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changePrints(active, -1)}
                      disabled={!active.prints}
                      aria-label="Kurangi print"
                      className="size-11 rounded-xl bg-white border border-line font-bold hover:bg-yellow-50 disabled:opacity-40 cursor-pointer flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{active.prints || 0}</span>
                    <button
                      type="button"
                      onClick={() => changePrints(active, 1)}
                      aria-label="Tambah print"
                      className="size-11 rounded-xl bg-white border border-line font-bold hover:bg-yellow-50 cursor-pointer flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {active.status === 'serving' ? (
                <button
                  type="button"
                  onClick={() => complete(active)}
                  disabled={busy}
                  className="w-full min-h-12 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <FiCheck size={18} />
                  <span>Selesai Foto &amp; Catat</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startServing(active)}
                  disabled={busy}
                  className="w-full min-h-12 px-4 rounded-2xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-ink-900 font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <FiCamera size={18} />
                  <span>Mulai Foto</span>
                </button>
              )}

              <div className={`grid gap-2 ${active.status === 'serving' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {active.status !== 'serving' && (
                  <button
                    type="button"
                    onClick={() => recall(active)}
                    disabled={busy}
                    className="min-h-11 px-3 rounded-xl border border-line hover:bg-bg disabled:opacity-60 text-xs font-bold text-ink-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiVolume2 size={14} />
                    <span>Panggil Ulang</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => skip(active)}
                  disabled={busy}
                  className="min-h-11 px-3 rounded-xl border border-line hover:bg-bg disabled:opacity-60 text-xs font-bold text-ink-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FiSkipForward size={14} />
                  <span>Lewati</span>
                </button>
              </div>

              {active.status !== 'serving' && (
                <button
                  type="button"
                  onClick={() => complete(active)}
                  disabled={busy}
                  className="text-xs text-ink-500 hover:text-ink-900 underline underline-offset-2 mx-auto min-h-11 px-2 cursor-pointer"
                >
                  Langsung tandai selesai
                </button>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-ink-500">
              <p className="text-sm font-medium">Belum ada tamu yang dipanggil</p>
            </div>
          )}
        </section>

        {/* Berikutnya */}
        <section className="bg-white rounded-3xl border border-line p-5 sm:p-6 shadow-2xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Berikutnya</h2>
              <span className="text-xs font-bold tabular-nums text-ink-700 bg-bg px-2.5 py-0.5 rounded-full border border-line">
                {waiting.length} menunggu
              </span>
            </div>

            {waiting[0] ? (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-bg border border-line mb-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-700">Nomor Giliran Selanjutnya</p>
                  <p className="text-xs text-ink-500 mt-0.5">Siap dipanggil ke booth</p>
                </div>
                <p className="text-3xl font-black tabular-nums text-ink-900">{waiting[0].queue_number}</p>
              </div>
            ) : (
              <p className="text-xs text-ink-500 mb-4">Tidak ada tamu yang menunggu saat ini.</p>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={requestCallNext}
              disabled={busy || waiting.length === 0}
              className="w-full min-h-12 px-4 rounded-2xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-ink-900 font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <FiPlay size={16} />
              <span>Panggil Berikutnya</span>
            </button>
            <label className="flex items-start gap-2.5 text-xs text-ink-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSession}
                onChange={(e) => setAutoSession(e.target.checked)}
                className="mt-0.5 rounded w-4 h-4 accent-yellow-500"
              />
              <span>Catat +1 sesi foto otomatis saat tamu selesai</span>
            </label>
          </div>
        </section>
      </div>

      {/* Daftar antrean */}
      <section className="bg-white rounded-3xl border border-line shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line">
          <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter antrean">
            {TABS.map((t) => {
              const count =
                t.id === 'active' ? waiting.length + (active ? 1 : 0) : t.id === 'completed' ? completedCount : queues.length;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 min-h-11 px-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    tab === t.id ? 'bg-yellow-500 text-ink-900 shadow-2xs' : 'text-ink-700 hover:bg-yellow-50'
                  }`}
                >
                  {t.label} <span className="opacity-70 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="relative flex-1 min-w-36 sm:w-56 sm:flex-none">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} aria-hidden="true" />
              <input
                type="search"
                aria-label="Cari nomor antrean"
                placeholder="Cari nomor..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full min-h-11 pl-9 pr-3 rounded-xl border border-line text-xs focus:outline-hidden focus:border-yellow-500"
              />
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="shrink-0 size-11 flex items-center justify-center rounded-xl border border-line hover:bg-bg text-ink-700 cursor-pointer"
              aria-label="Muat ulang"
            >
              <FiRefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="shrink-0 min-h-11 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 text-xs font-bold cursor-pointer shadow-2xs"
            >
              <FiPlus size={14} />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {visibleQueues.length === 0 ? (
          <div className="text-center py-12 px-4 text-ink-500">
            <p className="text-xs">
              {queues.length === 0 ? 'Belum ada tamu yang mengambil tiket' : 'Tidak ada hasil'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visibleQueues.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <li key={item.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-bg/50">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span className="w-14 shrink-0 font-black text-ink-900 text-lg tabular-nums">{item.queue_number}</span>
                    <p className="text-xs text-ink-500 truncate tabular-nums">
                      {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      {!percentMode && item.no_voucher && ' • Tanpa voucher'}
                      {item.prints > 0 && ` • +${item.prints} print`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        meta.tone === 'live'
                          ? 'bg-emerald-100 text-emerald-800'
                          : meta.tone === 'warn'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-bg text-ink-700'
                      }`}
                    >
                      {meta.label}
                    </span>
                    {(item.status === 'skipped' || item.status === 'cancelled') && (
                      <button
                        type="button"
                        onClick={() => requeue(item)}
                        disabled={busy}
                        className="size-11 flex items-center justify-center rounded-xl border border-line text-ink-700 hover:bg-bg cursor-pointer"
                        aria-label={`Kembalikan ${item.queue_number} ke antrean`}
                      >
                        <FiRotateCcw size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setToDelete(item)}
                      className="size-11 flex items-center justify-center rounded-xl text-ink-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      aria-label={`Hapus ${item.queue_number}`}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {nextChoiceOpen && active && (
        <Modal
          title={`${active.queue_number} belum diselesaikan`}
          description={`Nomor ${active.queue_number} masih berstatus ${statusMeta(active.status).label.toLowerCase()}. Apa yang terjadi dengan antrean ini sebelum memanggil berikutnya?`}
          onClose={() => setNextChoiceOpen(false)}
          footer={
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setNextChoiceOpen(false);
                  callNext('skip');
                }}
                className="min-h-11 px-4 rounded-xl border border-line text-ink-700 text-xs font-bold hover:bg-bg cursor-pointer"
              >
                Tidak Datang (Lewati)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setNextChoiceOpen(false);
                  callNext('complete');
                }}
                className="min-h-11 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 text-xs font-bold cursor-pointer"
              >
                {active.status === 'serving' ? 'Selesai & Lanjut' : 'Sudah Difoto & Lanjut'}
              </button>
            </div>
          }
        />
      )}

      {addOpen && (
        <Modal
          title="Tambah Antrean Manual"
          description="Untuk tamu walk-in atau tanpa HP. Nomor langsung diterbitkan tanpa nama atau WhatsApp."
          size="sm"
          onClose={() => setAddOpen(false)}
          footer={
            <button
              type="button"
              disabled={addingGuest}
              onClick={handleAddManual}
              className="w-full min-h-11 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-ink-900 text-xs font-bold cursor-pointer shadow-sm"
            >
              {addingGuest ? 'Menerbitkan...' : `Terbitkan Nomor ${nextNumber(queues)}`}
            </button>
          }
        />
      )}

      {toDelete && (
        <Modal
          title="Hapus Antrean?"
          description={`Nomor ${toDelete.queue_number} akan dihapus permanen.`}
          size="sm"
          onClose={() => setToDelete(null)}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="min-h-11 px-4 rounded-xl border border-line text-ink-700 text-xs font-bold hover:bg-bg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = toDelete;
                  setToDelete(null);
                  remove(item);
                }}
                className="min-h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Hapus
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}

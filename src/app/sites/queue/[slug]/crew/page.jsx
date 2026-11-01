'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, use } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiExternalLink,
  FiTrash2,
  FiRefreshCw,
  FiPlay,
  FiCheck,
  FiSkipForward,
  FiVolume2,
  FiRotateCcw,
  FiCamera,
  FiPlus,
  FiGrid,
  FiShare2,
  FiCopy,
  FiSearch,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { usePolling } from '@/lib/usePolling';
import { playChime, unlockAudio } from '@/lib/chime';
import { isActive, statusMeta } from '@/lib/queueStatus';
import { formatRupiah } from '@/lib/pricelistDefaults';
import { formatDate, queueDisplayUrl, queueQrUrl, queueGuestUrl, tokenFromSlug } from '@/lib/appUrls';
import Modal from '@/components/ui/Modal';

const TABS = [
  { id: 'active', label: 'Antrean' },
  { id: 'completed', label: 'Selesai' },
  { id: 'all', label: 'Semua' },
];

export default function QueueCrewPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;
  const token = tokenFromSlug(slug);

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
  const [shareOpen, setShareOpen] = useState(false);
  const isCallingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      if (supabase && supabase.rpc) {
        const { data, error } = await supabase.rpc('get_crew_queue_data', { p_token: token });
        if (!error && data) {
          setInvalid(false);
          setEvent(data.event);
          setQueues(data.queues || []);
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Tanpa data dari server: tidak ada data karangan. Bila belum pernah termuat, tautan dianggap tidak valid.
    setEvent((prev) => {
      if (!prev) setInvalid(true);
      return prev;
    });
    setLoading(false);
  }, [token]);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      if (alive) await refresh();
    };
    init();
    return () => {
      alive = false;
    };
  }, [refresh]);

  usePolling(refresh, 5000, !invalid && !!token);

  // Realtime subscription via websocket
  useEffect(() => {
    const eventId = event?.id;
    if (!eventId || invalid || !supabase?.channel) return undefined;

    const channel = supabase
      .channel(`crew_queue_rt_${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_queues', filter: `event_id=eq.${eventId}` },
        () => {
          refresh();
        }
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

  const run = async (fn, errorMessage) => {
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

  const requestCallNext = async () => {
    if (isCallingRef.current || busy) return;
    isCallingRef.current = true;
    setBusy(true);

    try {
      if (waiting.length === 0) {
        toast('Tidak ada tamu yang menunggu');
        isCallingRef.current = false;
        setBusy(false);
        return;
      }
      if (active) {
        setNextChoiceOpen(true);
        setBusy(false);
      } else {
        await callNext('complete');
      }
    } catch {
      isCallingRef.current = false;
      setBusy(false);
    }
  };

  // Helper untuk mencatat tiket antrean selesai langsung ke Sesi Foto (financial_events.sessions)
  const recordQueueToSession = async (queueItem) => {
    if (!queueItem || !event?.id) return;
    try {
      const isPercent = event?.pricing_mode === 'percent';
      const newSession = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        queue_number: queueItem.queue_number,
        customer_name: queueItem.customer_name || '',
        no_voucher: !isPercent && !!queueItem.no_voucher,
        prints: queueItem.prints || 0,
        created_at: new Date().toISOString(),
      };

      if (supabase && supabase.from) {
        const { data } = await supabase
          .from('financial_events')
          .select('sessions')
          .eq('id', event.id)
          .maybeSingle();

        const currentSessions = Array.isArray(data?.sessions)
          ? data.sessions
          : Array.isArray(event.sessions)
          ? event.sessions
          : [];
        const updatedSessions = [newSession, ...currentSessions];

        await supabase
          .from('financial_events')
          .update({ sessions: updatedSessions })
          .eq('id', event.id);

        setEvent((prev) => (prev ? { ...prev, sessions: updatedSessions } : prev));
      }
    } catch (err) {
      console.warn('Sync crew queue to financial_events.sessions error:', err);
    }
  };

  const callNext = (currentAction = 'complete') =>
    run(async () => {
      unlockAudio();
      const prevActive = active ? { ...active } : null;

      try {
        if (supabase && supabase.rpc) {
          const { data, error } = await supabase.rpc('crew_queue_call_next', {
            p_token: token,
            p_auto_session: autoSession,
            p_current_action: currentAction,
          });
          if (!error && data) {
            if (prevActive && currentAction === 'complete' && autoSession) {
              await recordQueueToSession(prevActive);
            }
            await refresh();
            playChime(0.8);
            toast.success(`Memanggil ${data.queue_number}`);
            return;
          }
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal memanggil antrian');

  const complete = (item) =>
    run(async () => {
      try {
        if (supabase && supabase.rpc) {
          const { error } = await supabase.rpc('crew_queue_complete', {
            p_token: token,
            p_id: item.id,
            p_auto_session: autoSession,
          });
          if (!error) {
            if (autoSession) {
              await recordQueueToSession(item);
            }
            await refresh();
            toast.success(autoSession ? `${item.queue_number} selesai, sesi foto dicatat` : `${item.queue_number} selesai`);
            return;
          }
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal menyelesaikan antrian');

  const startServing = (item) =>
    run(async () => {
      try {
        if (supabase && supabase.rpc) {
          const { error } = await supabase.rpc('crew_queue_start', { p_token: token, p_id: item.id });
          if (!error) {
            setQueues((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'serving' } : q)));
            toast.success(`${item.queue_number} mulai difoto`);
            return;
          }
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal memulai sesi foto');

  const recall = (item) =>
    run(async () => {
      unlockAudio();
      try {
        if (supabase && supabase.rpc) {
          const { error } = await supabase.rpc('crew_queue_recall', { p_token: token, p_id: item.id });
          if (!error) {
            playChime(0.8);
            await refresh();
            toast.success(`Memanggil ulang ${item.queue_number}`);
            return;
          }
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal memanggil ulang');

  const skip = (item) =>
    run(async () => {
      try {
        if (supabase && supabase.rpc) {
          const { error } = await supabase.rpc('crew_queue_skip', { p_token: token, p_id: item.id });
          if (!error) {
            await refresh();
            toast.success(`${item.queue_number} dilewati`);
            return;
          }
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal melewati antrian');

  const requeue = (item) =>
    run(async () => {
      try {
        if (supabase && supabase.rpc) {
          const { error } = await supabase.rpc('crew_queue_requeue', { p_token: token, p_id: item.id });
          if (!error) {
            await refresh();
            toast.success(`${item.queue_number} kembali ke antrean`);
            return;
          }
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal mengembalikan antrian');

  const changePrints = async (item, delta) => {
    const next = Math.min(50, Math.max(0, (item.prints || 0) + delta));
    if (next === (item.prints || 0)) return;
    setQueues((prev) => prev.map((q) => (q.id === item.id ? { ...q, prints: next } : q)));
    try {
      if (supabase && supabase.rpc) {
        const { error } = await supabase.rpc('crew_queue_update_item', {
          p_token: token,
          p_id: item.id,
          p_prints: next,
        });
        if (error) throw error;
      }
    } catch {
      toast.error('Jumlah cetak tidak tersimpan');
      refresh();
    }
  };

  const setNoVoucher = async (item, value) => {
    if (!!item.no_voucher === value) return;
    setQueues((prev) => prev.map((q) => (q.id === item.id ? { ...q, no_voucher: value } : q)));
    try {
      if (supabase && supabase.rpc) {
        const { error } = await supabase.rpc('crew_queue_update_item', {
          p_token: token,
          p_id: item.id,
          p_no_voucher: value,
        });
        if (error) throw error;
      }
    } catch {
      toast.error('Status voucher tidak tersimpan');
      refresh();
    }
  };

  // Tambah tiket 1-tap instan tanpa form nama atau WA
  const handleAddManual = async (e) => {
    e?.preventDefault?.();
    setAddingGuest(true);
    try {
      let createdNumber = null;
      if (supabase && supabase.rpc) {
        const { data, error } = await supabase.rpc('crew_queue_add_manual', {
          p_token: token,
          p_name: '',
          p_phone: '',
        });
        if (!error && data) {
          createdNumber = data.queue_number;
        }
      }

      if (!createdNumber) {
        const nextSeq = queues.reduce((max, q) => Math.max(max, q.seq_number || 0), 0) + 1;
        createdNumber = `A-${String(nextSeq).padStart(2, '0')}`;
        setQueues((prev) => [
          ...prev,
          {
            id: `manual-${Date.now()}`,
            event_id: event?.id,
            queue_number: createdNumber,
            seq_number: nextSeq,
            customer_name: '',
            customer_phone: '',
            status: 'waiting',
            called_count: 0,
            prints: 0,
            no_voucher: false,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      toast.success(`Nomor ${createdNumber} berhasil diterbitkan`);
      setAddOpen(false);
      await refresh();
    } catch (err) {
      toast.error('Gagal menambah antrian: ' + (err.message || 'Error'));
    } finally {
      setAddingGuest(false);
    }
  };

  const remove = (item) =>
    run(async () => {
      try {
        if (supabase && supabase.rpc) {
          await supabase.rpc('crew_queue_remove', { p_token: token, p_id: item.id });
        }
      } catch {
        // diteruskan ke penanganan galat di bawah
      }

      throw new Error('Aksi ditolak server');
    }, 'Gagal menghapus antrian');

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-6 text-center">
        <div className="max-w-xs">
          <h1 className="text-xl font-heading font-extrabold text-slate-900">Link Kru Tidak Valid</h1>
          <p className="text-xs text-slate-500 mt-2">
            Link akses kru antrian tidak ditemukan atau belum terdaftar di sistem.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 gap-3 p-6">
        <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat kontrol antrian kru...</p>
      </div>
    );
  }

  const guestUrl = queueGuestUrl(event);
  const displayUrl = queueDisplayUrl(event);
  const qrPageUrl = queueQrUrl(event);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <title>Kru Antrean - MemoriBox.id</title>
      <Toaster position="top-center" />

      {/* Header Kru */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="font-heading font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate">
                {event?.name || 'Terminal Kru Antrean'}
              </h1>
              <p className="text-xs text-slate-500">{formatDate(event?.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {guestUrl && (
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                <FiShare2 size={14} />
                <span className="hidden sm:inline">Bagikan</span>
              </button>
            )}
            {qrPageUrl && (
              <a
                href={qrPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                <FiGrid size={14} />
                <span className="hidden sm:inline">QR Kios</span>
              </a>
            )}
            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                <FiExternalLink size={14} />
                <span className="hidden sm:inline">Layar TV</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Card Sedang Dilayani */}
          <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs lg:col-span-3">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sedang Dilayani
              </h2>
              {active && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{statusMeta(active.status).label}</span>
                </span>
              )}
            </div>

            {active ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 leading-none">
                      {active.queue_number}
                    </p>
                  </div>
                  {(() => {
                    const price = priceOf(active);
                    return (
                      <div className="text-right">
                        <p className="text-2xl font-black font-mono text-slate-900">
                          {formatRupiah(price.total)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {percentMode ? 'Sesi ' : ''}{formatRupiah(price.base)}
                          {price.prints > 0 && ` + ${price.prints}x${formatRupiah(price.printPrice).replace('Rp ', '')}`}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Voucher + Print controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {!percentMode && (
                    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 p-1 bg-slate-50">
                      {[
                        { v: false, label: 'Pakai Voucher' },
                        { v: true, label: 'Tanpa Voucher' },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => setNoVoucher(active, o.v)}
                          className={`rounded-xl py-2 px-2 text-xs font-bold transition-colors cursor-pointer ${
                            !!active.no_voucher === o.v
                              ? 'bg-yellow-400 text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 px-3 py-1 bg-slate-50">
                    <span className="text-xs text-slate-600 font-medium">Print Tambahan</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => changePrints(active, -1)}
                        disabled={!active.prints}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-bold font-mono">
                        {active.prints || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => changePrints(active, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {active.status === 'serving' ? (
                  <button
                    type="button"
                    onClick={() => complete(active)}
                    disabled={busy}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <FiCheck size={18} />
                    <span>Selesai Foto & Catat</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startServing(active)}
                    disabled={busy}
                    className="w-full py-3.5 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                      className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FiVolume2 size={14} />
                      <span>Panggil Ulang</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => skip(active)}
                    disabled={busy}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiSkipForward size={14} />
                    <span>Lewati</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm font-medium">Belum ada tamu yang dipanggil</p>
              </div>
            )}
          </section>

          {/* Card Antrean Berikutnya */}
          <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Berikutnya
                </h2>
                <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {waiting.length} menunggu
                </span>
              </div>

              {waiting[0] ? (
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">Nomor Giliran Selanjutnya</p>
                    <p className="text-xs text-slate-400 mt-0.5">Siap dipanggil ke panggung</p>
                  </div>
                  <p className="text-3xl font-black font-mono text-slate-900">
                    {waiting[0].queue_number}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-4">Tidak ada tamu yang menunggu saat ini.</p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={requestCallNext}
                disabled={busy || waiting.length === 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-900 font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FiPlay size={16} />
                <span>Panggil Berikutnya</span>
              </button>
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSession}
                  onChange={(e) => setAutoSession(e.target.checked)}
                  className="rounded text-yellow-500 focus:ring-yellow-400 w-4 h-4"
                />
                <span>Catat +1 sesi foto otomatis saat tamu selesai</span>
              </label>
            </div>
          </section>
        </div>

        {/* Tabel / Daftar Antrean */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex gap-1.5 overflow-x-auto">
              {TABS.map((t) => {
                const count =
                  t.id === 'active'
                    ? waiting.length + (active ? 1 : 0)
                    : t.id === 'completed'
                    ? completedCount
                    : queues.length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      tab === t.id
                        ? 'bg-yellow-400 text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {t.label} <span className="opacity-70 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="search"
                  placeholder="Cari nomor..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-yellow-400"
                />
              </div>
              <button
                type="button"
                onClick={() => refresh()}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                aria-label="Refresh"
              >
                <FiRefreshCw size={14} className={busy ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-bold cursor-pointer shadow-2xs"
              >
                <FiPlus size={14} />
                <span>Tambah</span>
              </button>
            </div>
          </div>

          {visibleQueues.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <p className="text-xs">
                {queues.length === 0 ? 'Belum ada antrean diterbitkan' : 'Tidak ada hasil pencarian'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleQueues.map((item) => {
                const meta = statusMeta(item.status);
                return (
                  <li key={item.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-14 shrink-0 font-mono font-black text-slate-900 text-lg">
                        {item.queue_number}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {!percentMode && item.no_voucher && ' • Tanpa voucher'}
                          {item.prints > 0 && ` • +${item.prints} print`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          meta.tone === 'live'
                            ? 'bg-emerald-100 text-emerald-800'
                            : meta.tone === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {meta.label}
                      </span>
                      {(item.status === 'skipped' || item.status === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => requeue(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Kembalikan ke antrean"
                        >
                          <FiRotateCcw size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setToDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Hapus"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Modal Bagikan Link */}
      {shareOpen && event && (
        <Modal
          title="Tampilan Antrian & QR"
          description={event.name}
          onClose={() => setShareOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="py-2 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Tutup
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border border-slate-200 hover:border-yellow-400 bg-white hover:bg-yellow-50/30 transition-all flex flex-col items-center text-center gap-2"
              >
                <FiExternalLink size={20} className="text-yellow-600" />
                <span className="text-xs font-bold text-slate-900">Buka Layar TV</span>
                <span className="text-[11px] text-slate-400">Panggung utama</span>
              </a>
              <a
                href={qrPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border border-slate-200 hover:border-yellow-400 bg-white hover:bg-yellow-50/30 transition-all flex flex-col items-center text-center gap-2"
              >
                <FiGrid size={20} className="text-yellow-600" />
                <span className="text-xs font-bold text-slate-900">Halaman QR Tamu</span>
                <span className="text-[11px] text-slate-400">Kios tablet meja booth</span>
              </a>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 truncate">{guestUrl}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(guestUrl);
                    toast.success('Link antrean disalin!');
                  } catch {
                    toast.error('Gagal menyalin link');
                  }
                }}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-bold cursor-pointer shrink-0"
              >
                <FiCopy size={13} /> Salin link
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Panggil Berikutnya (Pilih Nasib Tamu Aktif) */}
      {nextChoiceOpen && active && (
        <Modal
          title={`Selesaikan nomor ${active.queue_number}?`}
          description="Masih ada tamu aktif di booth. Pilih nasib tamu tersebut sebelum memanggil nomor berikutnya."
          onClose={() => setNextChoiceOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setNextChoiceOpen(false);
                  callNext('skip');
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
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
                className="py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-bold cursor-pointer"
              >
                Selesai & Lanjut
              </button>
            </div>
          }
        />
      )}

      {/* Modal Tambah Antrian Manual: 1-Tap Instan Tanpa Form Nama/WA */}
      {addOpen && (
        <Modal
          title="Tambah Antrian Manual"
          description="Terbitkan tiket antrean baru secara 1-tap instan tanpa mengisi nama atau nomor WhatsApp."
          size="sm"
          onClose={() => setAddOpen(false)}
          footer={
            <div className="w-full flex justify-end gap-2">
              <button
                type="button"
                disabled={addingGuest}
                onClick={handleAddManual}
                className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-bold cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {addingGuest
                  ? 'Menerbitkan...'
                  : `Terbitkan Nomor A-${String(
                      (queues.reduce((max, q) => Math.max(max, q.seq_number || 0), 0) || 0) + 1
                    ).padStart(2, '0')}`}
              </button>
            </div>
          }
        />
      )}

      {/* Modal Hapus */}
      {toDelete && (
        <Modal
          title="Hapus Antrian?"
          description={`Nomor ${toDelete.queue_number} akan dihapus secara permanen.`}
          size="sm"
          onClose={() => setToDelete(null)}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => remove(toDelete)}
                className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
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

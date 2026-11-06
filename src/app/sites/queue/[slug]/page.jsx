'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, use } from 'react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiBell,
  FiCheck,
  FiVolume2,
  FiRotateCcw,
  FiNavigation,
  FiCamera,
  FiArrowRight,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { usePolling } from '@/lib/usePolling';
import { playChime, unlockAudio, vibrate } from '@/lib/chime';
import { ACTIVE_STATUSES, estimateMinutes, formatEstimate, statusMeta } from '@/lib/queueStatus';

const ticketStorageKey = (token) => `memoribox_ticket_${token}`;
const stateStorageKey = (token) => `memoribox_state_${token}`;

const readTicketId = (token) => {
  try {
    return localStorage.getItem(ticketStorageKey(token)) || null;
  } catch {
    return null;
  }
};

const writeTicketId = (token, id) => {
  try {
    if (id) localStorage.setItem(ticketStorageKey(token), id);
    else localStorage.removeItem(ticketStorageKey(token));
  } catch {}
};

const readCachedState = (token) => {
  try {
    if (!token) return null;
    const raw = sessionStorage.getItem(stateStorageKey(token)) || localStorage.getItem(stateStorageKey(token));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedState = (token, data) => {
  try {
    if (!token) return;
    if (data) {
      const serialized = JSON.stringify(data);
      sessionStorage.setItem(stateStorageKey(token), serialized);
      localStorage.setItem(stateStorageKey(token), serialized);
    } else {
      sessionStorage.removeItem(stateStorageKey(token));
      localStorage.removeItem(stateStorageKey(token));
    }
  } catch {}
};

const FINISHED = ['completed', 'skipped', 'cancelled'];

const Stat = ({ label, value, sub, highlight }) => {
  const isWord = typeof value === 'string' && /[a-zA-Z]{3,}/.test(value);
  return (
    <div
      className={`rounded-2xl px-2 py-3 text-center border overflow-hidden flex flex-col justify-center min-w-0 ${
        highlight
          ? 'bg-yellow-50 border-yellow-300'
          : 'bg-white border-slate-200'
      }`}
    >
      <dt className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-tight truncate">
        {label}
      </dt>
      <dd
        className={`font-black leading-tight mt-1 truncate ${
          isWord
            ? 'text-xs uppercase tracking-tight text-amber-900 font-sans'
            : 'text-xl sm:text-2xl font-mono text-slate-900'
        }`}
      >
        {value}
      </dd>
      {sub && <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 truncate">{sub}</p>}
    </div>
  );
};

export default function GuestQueuePage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;
  // Seluruh slug dikirim ke server: bisa slug cantik atau tautan lama 'nama-token'.
  const token = slug;

  const [ticketId, setTicketId] = useState(() => readTicketId(token));
  const [state, setState] = useState(() => readCachedState(token));
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const refreshRef = useRef();
  const hasStateRef = useRef(!!state);
  const inFlightRef = useRef(false);
  const releaseTicketRef = useRef();
  const isReleasedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const currentTicketId = isReleasedRef.current ? null : ticketId || readTicketId(token);

      // Coba fetch dari Supabase RPC
      let data = null;
      try {
        if (supabase && supabase.rpc) {
          const res = await supabase.rpc('get_queue_state', {
            p_token: token,
            p_ticket_id: currentTicketId || null,
          });
          if (!res.error && res.data) {
            data = res.data;
          }
        }
      } catch (e) {
        console.warn('get_queue_state error:', e);
      }

      // Tanpa data dari server: jangan mengarang antrean. Pertahankan data terakhir; bila belum ada, tandai tidak valid.
      if (!data) {
        setInvalid((prev) => prev || !hasStateRef.current);
        return;
      }
      setInvalid(false);

      hasStateRef.current = true;
      setState(data);
      writeCachedState(token, data);

      if (data.ticket?.id) {
        if (!isReleasedRef.current && data.ticket.id !== ticketId) {
          setTicketId(data.ticket.id);
          writeTicketId(token, data.ticket.id);
        }
      } else if (currentTicketId && !isReleasedRef.current) {
        setTicketId(null);
        writeTicketId(token, null);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [token, ticketId]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Muat awal hanya saat token berubah. (Bergantung pada `refresh` akan memicu permintaan beruntun tanpa jeda.)
  useEffect(() => {
    const init = async () => {
      await refreshRef.current?.();
    };
    init();
  }, [token]);

  const ticket = state?.ticket || null;
  const board = useMemo(() => state?.board || [], [state]);
  const myTurn = !!ticket && ACTIVE_STATUSES.includes(ticket.status);

  const waiting = useMemo(() => board.filter((q) => q.status === 'waiting'), [board]);
  const position = ticket?.status === 'waiting' ? waiting.findIndex((q) => q.id === ticket.id) + 1 : 0;
  const ahead = Math.max(0, position - 1);
  const interval = !ticket ? 3000 : myTurn || (position > 0 && position <= 3) ? 1500 : 2500;
  usePolling(refresh, interval, !invalid);

  // Realtime subscription via websocket
  useEffect(() => {
    const eventId = state?.event?.id;
    if (!eventId || invalid || !supabase?.channel) return undefined;

    const channel = supabase
      .channel(`queue_guest_rt_${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_queues', filter: `event_id=eq.${eventId}` },
        () => {
          refreshRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state?.event?.id, invalid]);

  // Peringatan saat status 'called'
  const callKey = ticket?.status === 'called' ? `${ticket.called_count}_${ticket.called_at || 'now'}` : null;
  const [dismissedCallKey, setDismissedCallKey] = useState(null);
  const callOpen = Boolean(callKey && callKey !== dismissedCallKey);

  useEffect(() => {
    if (!callOpen) return undefined;
    const ring = () => {
      playChime(1);
      vibrate();
    };
    ring();
    const id = setInterval(ring, 4000);
    return () => clearInterval(id);
  }, [callOpen, ticket?.queue_number]);

  const liveTicket = !!ticket && !FINISHED.includes(ticket.status);
  const finished = !!ticket && FINISHED.includes(ticket.status);

  // Release ticket handler
  const releaseTicket = useCallback(
    async (leave = false) => {
      const currentTicketId = ticketId;
      isReleasedRef.current = true;
      setTicketId(null);
      writeTicketId(token, null);
      setLeaveOpen(false);

      if (leave && currentTicketId) {
        try {
          if (supabase && supabase.rpc) {
            await supabase.rpc('queue_leave', { p_ticket_id: currentTicketId });
          }
        } catch {}
      }

      setState((prev) => (prev ? { ...prev, ticket: null } : prev));
      writeCachedState(token, null);

      try {
        if (supabase && supabase.rpc) {
          const { data } = await supabase.rpc('get_queue_state', { p_token: token, p_ticket_id: null });
          if (data) {
            setState(data);
            writeCachedState(token, data);
          }
        }
      } catch {}
    },
    [ticketId, token]
  );

  useEffect(() => {
    releaseTicketRef.current = releaseTicket;
  }, [releaseTicket]);

  // Hitung mundur 30 detik saat selesai untuk menutup otomatis
  useEffect(() => {
    if (!finished || isReleasedRef.current) {
      setCountdown(30);
      return undefined;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          releaseTicketRef.current?.(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finished]);

  // Jaga layar tetap menyala selama menunggu
  useEffect(() => {
    if (!liveTicket || !('wakeLock' in navigator)) return undefined;
    let lock = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {}
    };
    const onVisible = () => {
      if (!document.hidden) acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, [liveTicket]);

  // Ambil nomor: TANPA NAMA, TANPA WA! 1-klik langsung seperti SnapHub
  const takeTicket = async (e) => {
    e?.preventDefault?.();
    unlockAudio();
    if (submitting || !token) return;
    setSubmitting(true);

    try {
      let data = null;
      let error = null;

      try {
        if (supabase && supabase.rpc) {
          const res = await supabase.rpc('take_queue_ticket', {
            p_token: token,
            p_name: '',
            p_phone: '',
          });
          data = res.data;
          error = res.error;
        }
      } catch (err) {
        error = err;
      }

      // Nomor hanya sah bila dibuat server; jika gagal, jangan membuat tiket palsu di perangkat.
      if (error || !data?.id) {
        const closed = /ditutup/i.test(error?.message || '');
        toast.error(closed ? 'Antrean sedang ditutup.' : 'Gagal mengambil nomor. Coba lagi.');
        if (closed) refresh();
        return;
      }

      isReleasedRef.current = false;
      const newId = data.id;
      setTicketId(newId);
      writeTicketId(token, newId);

      if (data.state) {
        setState(data.state);
        writeCachedState(token, data.state);
      } else {
        refresh();
      }

      toast.success(`Nomor Anda: ${data.queue_number}`);
    } catch (err) {
      toast.error('Gagal mengambil nomor. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmHeading = async () => {
    if (callKey) setDismissedCallKey(callKey);
    if (!ticket?.id) return;
    try {
      if (supabase && supabase.rpc) {
        await supabase.rpc('queue_confirm_heading', { p_ticket_id: ticket.id });
      }
      setState((prev) =>
        prev && prev.ticket ? { ...prev, ticket: { ...prev.ticket, status: 'heading' } } : prev
      );
      toast.success('Operator telah diberitahu Anda menuju booth!');
    } catch {}
  };

  const testSound = () => {
    unlockAudio();
    playChime(1);
    vibrate();
  };

  if (invalid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
          <FiBell size={24} />
        </div>
        <h1 className="text-xl font-heading font-extrabold text-slate-900">
          Antrean Tidak Ditemukan
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Tautan antrean ini tidak valid atau acara telah selesai.
        </p>
      </div>
    );
  }

  const active = board.find((q) => ACTIVE_STATUSES.includes(q.status));
  const aheadForNew = waiting.length + (active ? 1 : 0);
  const aheadForMe = ahead + (active ? 1 : 0);

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col select-none font-sans overflow-x-hidden">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="shrink-0 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-200 bg-white shadow-2xs">
        <div className="relative w-32 h-8">
          <Image src="/logo.png" alt="Memoribox" fill priority sizes="128px" className="object-contain object-left" />
        </div>
        <button
          type="button"
          onClick={testSound}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tes suara"
        >
          <FiVolume2 size={13} />
          <span>Tes suara</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6 sm:py-8 flex flex-col justify-center gap-5">
        {/* Event Banner */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-900">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            <span>Antrean Photobooth</span>
          </span>

          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 mt-2 leading-tight">
            {state?.event?.name || 'Memoribox Photobooth'}
          </h1>
        </div>

        {/* Guest Ticket Display or Action Card */}
        {!ticket && state?.event?.queue_open === false ? (
          <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-7 shadow-xs text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <FiBell size={22} />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900">Antrean Sedang Ditutup</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Pengambilan nomor belum dibuka atau sudah selesai. Hubungi kru di booth jika Anda ingin difoto.
            </p>
          </div>
        ) : !ticket ? (
          /* Card Ambil Nomor Antrean (TANPA NAMA, TANPA WA - PERSIS SNAPHUB) */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs text-center space-y-5">
            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Ambil Nomor Antrean
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Tidak perlu berdiri menunggu di depan booth. HP Anda akan berbunyi saat giliran tiba.
              </p>
            </div>

            {/* Quick Live Stats */}
            <dl className="grid grid-cols-3 gap-2 w-full">
              <Stat label="Giliran" value={active ? active.queue_number : '–'} />
              <Stat label="Menunggu" value={`${waiting.length}`} sub="antrean" />
              <Stat
                label="Estimasi"
                value={aheadForNew === 0 ? 'Langsung' : formatEstimate(estimateMinutes(aheadForNew, state?.avg_service_seconds)).replace('± ', '')}
                highlight
              />
            </dl>

            {/* Big 1-Click Button */}
            <button
              type="button"
              onClick={takeTicket}
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-heading font-extrabold text-base shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Menerbitkan tiket...</span>
                </>
              ) : (
                <>
                  <span>Ambil Nomor Sekarang</span>
                  <FiArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Active Ticket Card */
          <div className="space-y-4">
            <div
              className={`rounded-3xl border bg-white p-6 sm:p-7 text-center shadow-xs transition-all ${
                myTurn ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]' : 'border-slate-200'
              }`}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Nomor Antrean Anda
              </p>
              <p className="text-6xl sm:text-7xl font-mono font-black text-slate-900 tracking-tight my-2">
                {ticket.queue_number}
              </p>

              <div className="mt-3">
                {myTurn ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 shadow-xs">
                    {ticket.status === 'serving' ? (
                      <>
                        <FiCamera size={14} /> Sedang difoto
                      </>
                    ) : ticket.status === 'heading' ? (
                      <>
                        <FiNavigation size={14} /> Menuju booth
                      </>
                    ) : (
                      <>
                        <FiBell size={14} /> Giliran Anda sekarang!
                      </>
                    )}
                  </span>
                ) : finished ? (
                  <p className="text-xs font-semibold text-slate-500">
                    {ticket.status === 'completed'
                      ? 'Sesi foto selesai. Terima kasih!'
                      : ticket.status === 'skipped'
                      ? 'Nomor Anda dilewati. Hubungi kru di booth.'
                      : 'Nomor antrean ini telah dibatalkan.'}
                  </p>
                ) : position > 0 && position <= 2 ? (
                  <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 text-amber-900 font-bold text-xs px-4 py-1.5">
                    Segera merapat ke booth
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">Menunggu giliran</span>
                )}
              </div>
            </div>

            {/* Waiting Details */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <dl className={`grid gap-2 ${ticket.status === 'waiting' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                <Stat
                  label="Giliran"
                  value={active ? active.queue_number : '–'}
                  sub={active ? statusMeta(active.status).label : undefined}
                />
                {ticket.status === 'waiting' && (
                  <>
                    <Stat label="Di depan Anda" value={`${ahead}`} sub="antrean" />
                    <Stat
                      label="Estimasi"
                      value={aheadForMe === 0 ? 'Langsung' : formatEstimate(estimateMinutes(aheadForMe, state?.avg_service_seconds)).replace('± ', '')}
                      highlight
                    />
                  </>
                )}
              </dl>

              <p className="text-xs text-center text-slate-500 leading-relaxed">
                {myTurn
                  ? 'Tunjukkan nomor ini ke kru di booth photobooth.'
                  : finished
                  ? ''
                  : 'Estimasi hanya perkiraan. Biarkan halaman ini tetap terbuka, HP akan berbunyi saat giliran Anda tiba.'}
              </p>

              <div className="pt-1 flex justify-center">
                {finished ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => releaseTicket(false)}
                      className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold text-sm shadow-2xs"
                    >
                      Selesai {countdown > 0 ? `(${countdown}s)` : ''}
                    </button>
                    <p className="text-[11px] text-slate-400 text-center">
                      Halaman ditutup otomatis dalam <strong>{countdown}</strong> detik
                    </p>
                  </div>
                ) : ticket.status === 'waiting' ? (
                  <button
                    type="button"
                    onClick={() => setLeaveOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <FiRotateCcw size={13} />
                    <span>Batalkan nomor antrean</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Panggilan Saat Giliran Tiba */}
      {callOpen && ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border-2 border-emerald-500 p-6 sm:p-7 text-center shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto animate-bounce">
              <FiBell size={24} />
            </div>
            <h2 className="text-2xl font-heading font-black text-slate-900">
              Giliran Anda Tiba!
            </h2>
            <p className="text-5xl sm:text-6xl font-mono font-black text-slate-900 my-2">
              {ticket.queue_number}
            </p>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Silakan segera menuju panggung booth dan tunjukkan nomor ini kepada kru Memoribox.
            </p>
            <button
              type="button"
              autoFocus
              onClick={confirmHeading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <FiCheck size={16} />
              <span>Saya Menuju Booth</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Batalkan Tiket */}
      {leaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-center shadow-xl space-y-4">
            <h2 className="text-lg font-heading font-extrabold text-slate-900">
              Batalkan Nomor Ini?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nomor <strong className="font-mono text-slate-900">{ticket?.queue_number}</strong> akan dilepas dan Anda keluar dari antrean.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => setLeaveOpen(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Tidak
              </button>
              <button
                type="button"
                onClick={() => releaseTicket(true)}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3 border-t border-slate-200">
        Memoribox Smart Queue System
      </footer>
    </div>
  );
}

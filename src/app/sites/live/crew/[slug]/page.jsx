'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiCalendar,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiWifiOff,
} from 'react-icons/fi';
import SwipeableSessionRow from '@/components/SwipeableSessionRow';
import {
  VOUCHER_PRICE,
  NO_VOUCHER_PRICE,
  PRINT_PRICE,
  sessionPrice,
  eventTotal,
  pricingOf,
} from '@/lib/photoSession';
import { supabase } from '@/lib/supabase';

const REFRESH_MS = 4000;

const formatRp = (n) => {
  const num = Math.round(Number(n) || 0);
  const parts = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return num < 0 ? `-Rp ${parts}` : `Rp ${parts}`;
};

export default function CrewSesiPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;
  const token = slug?.split('-').pop();

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [noVoucher, setNoVoucher] = useState(false);
  const [prints, setPrints] = useState(0);
  const pricing = pricingOf(event);
  const percent = pricing.mode === 'percent';
  const [confirmId, setConfirmId] = useState(null);
  const [hideTotal, setHideTotal] = useState(() => {
    try {
      return localStorage.getItem('sesiHideTotal') === '1';
    } catch {
      return false;
    }
  });

  const chain = useRef(Promise.resolve());
  const pending = useRef(0);
  const isAddingRef = useRef(false);
  const [isAddingSession, setIsAddingSession] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sesiHideTotal', hideTotal ? '1' : '0');
    } catch {}
  }, [hideTotal]);

  const fetchCrewEvent = useCallback(async (tkn) => {
    try {
      if (supabase && supabase.rpc) {
        const { data, error } = await supabase.rpc('get_crew_event', { p_token: tkn });
        if (!error && data) return data;
      }
    } catch (e) {
      console.warn('RPC get_crew_event error:', e);
    }

    // Tidak ditemukan: jangan mengarang acara.
    return null;
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (pending.current > 0) return;
      try {
        const data = await fetchCrewEvent(token);
        if (!active || pending.current > 0) return;
        if (!data) {
          setEvent(null);
          setStatus('notfound');
          return;
        }
        setEvent(data);
        setStatus('ready');
      } catch {
        if (active) setStatus((s) => (s === 'ready' ? s : 'error'));
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token, fetchCrewEvent]);

  const handleAdd = async () => {
    if (isAddingRef.current) return;
    isAddingRef.current = true;
    setIsAddingSession(true);

    const newSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      no_voucher: percent ? false : noVoucher,
      prints,
      created_at: new Date().toISOString(),
    };

    setEvent((prev) => {
      if (!prev) return prev;
      return { ...prev, sessions: [newSession, ...(prev.sessions || [])] };
    });

    try {
      const { data, error } = await supabase.rpc('crew_add_session', {
        p_token: token,
        p_id: newSession.id,
        p_no_voucher: newSession.no_voucher,
        p_prints: prints,
      });
      if (error || !data) throw error || new Error('Sesi ditolak server');
      setEvent((prev) => ({ ...prev, ...data }));
      toast.success(
        `Sesi ${newSession.no_voucher ? 'non-voucher' : 'voucher'}${
          prints > 0 ? ` (+${prints} cetak)` : ''
        } tercatat`
      );
    } catch {
      // batalkan penambahan sementara agar layar sama dengan server
      setEvent((prev) => (prev ? { ...prev, sessions: (prev.sessions || []).filter((x) => x.id !== newSession.id) } : prev));
      toast.error('Gagal menyimpan sesi');
    } finally {
      setNoVoucher(false);
      setPrints(0);
      isAddingRef.current = false;
      setIsAddingSession(false);
    }
  };

  const handleDelete = async (id) => {
    const previous = event?.sessions || [];
    setEvent((prev) => (prev ? { ...prev, sessions: (prev.sessions || []).filter((s) => s.id !== id) } : prev));

    try {
      const { data, error } = await supabase.rpc('crew_delete_session', { p_token: token, p_id: id });
      if (error || !data) throw error || new Error('Penghapusan ditolak server');
      setEvent((prev) => ({ ...prev, ...data }));
      toast.success('Sesi berhasil dihapus');
    } catch {
      setEvent((prev) => (prev ? { ...prev, sessions: previous } : prev));
      toast.error('Gagal menghapus sesi');
    }
  };

  const sessions = event?.sessions || [];
  const currentTotal = eventTotal(event, pricing);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-20 font-sans">
      <title>Catat Sesi - MemoriBox.id</title>
      <Toaster position="top-center" />

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Memuat terminal operator...</p>
        </div>
      )}

      {(status === 'notfound' || status === 'error') && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
            <FiWifiOff size={24} />
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900">
            Akses Operator Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Token operator crew tidak valid. Hubungi admin untuk tautan yang benar.
          </p>
        </div>
      )}

      {status === 'ready' && event && (
        <div className="max-w-md mx-auto px-4 py-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded font-bold border border-yellow-300">
                Operator Sesi Foto
              </span>
              <h1 className="text-lg font-heading font-extrabold text-slate-900 mt-1">
                {event.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                <FiCalendar size={12} className="text-slate-400" />
                <span>{event.date || 'Tanpa tanggal'}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideTotal((v) => !v)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 shadow-2xs"
              title={hideTotal ? 'Tampilkan omzet' : 'Sembunyikan omzet'}
            >
              {hideTotal ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>

          {/* Total Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Total Sesi & Omzet
              </p>
              <p className="text-xl font-heading font-extrabold text-slate-900 mt-1">
                {hideTotal ? 'Rp ••••••••' : formatRp(currentTotal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-heading font-black text-slate-900 tabular-nums">
                {sessions.length}
              </span>
              <span className="text-xs text-slate-500 font-semibold block">sesi</span>
            </div>
          </div>

          {/* Action Box: Tambah Sesi */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Input Sesi Baru
            </h2>

            {/* Toggle Voucher vs Non-Voucher */}
            {!percent && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNoVoucher(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    !noVoucher
                      ? 'bg-yellow-400 text-slate-900 border-yellow-500 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Voucher ({formatRp(pricing.voucherPrice)})
                </button>
                <button
                  type="button"
                  onClick={() => setNoVoucher(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    noVoucher
                      ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Non-Voucher ({formatRp(pricing.noVoucherPrice)})
                </button>
              </div>
            )}

            {/* Print Extra Counter */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Cetak Ekstra</span>
                <span className="text-[10px] text-slate-500">
                  +{formatRp(pricing.printPrice)} per lembar
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrints((p) => Math.max(0, p - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 shadow-2xs"
                >
                  <FiMinus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-bold text-slate-900 font-mono">
                  {prints}
                </span>
                <button
                  type="button"
                  onClick={() => setPrints((p) => p + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 shadow-2xs"
                >
                  <FiPlus size={14} />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isAddingSession}
              onClick={handleAdd}
              className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-heading font-extrabold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAddingSession ? (
                <>
                  <FiLoader className="animate-spin text-base" />
                  <span>Mencatat...</span>
                </>
              ) : (
                <>
                  <FiPlus className="text-base" />
                  <span>
                    Catat Sesi (
                    {formatRp(
                      sessionPrice(
                        { no_voucher: percent ? false : noVoucher, prints },
                        pricing
                      )
                    )}
                    )
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sesi List with Swipe to Delete */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Riwayat Sesi
              </h2>
              <span className="text-[11px] text-slate-400">Geser ke kiri untuk hapus</span>
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada sesi tercatat.</p>
            ) : (
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                {sessions.map((s, idx) => (
                  <SwipeableSessionRow key={s.id} onDelete={() => handleDelete(s.id)}>
                    <div className="flex items-center justify-between py-2 px-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center font-mono shrink-0">
                          {sessions.length - idx}
                        </span>
                        {!percent && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.no_voucher
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-yellow-100 text-yellow-900 border border-yellow-300/80'
                            }`}
                          >
                            {s.no_voucher ? 'Non-Voucher' : 'Voucher'}
                          </span>
                        )}
                        {s.prints > 0 && (
                          <span className="text-[10px] text-slate-500 font-semibold">
                            +{s.prints} print
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {formatRp(sessionPrice(s, pricing))}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(s.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </SwipeableSessionRow>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

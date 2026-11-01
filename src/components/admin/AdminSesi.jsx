'use client';

import React, { useState, useEffect } from 'react';
import {
  FiPlus,
  FiMinus,
  FiExternalLink,
  FiTrash2,
  FiCamera,
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiArrowLeft,
  FiSearch,
  FiDollarSign,
  FiUserCheck,
  FiFolder,
  FiPercent,
  FiSettings,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatEvent } from '@/lib/eventModel';
import NewEventModal from '@/components/admin/NewEventModal';
import PricingConfigModal from '@/components/admin/PricingConfigModal';
import { useModal } from '@/components/ui/ModalProvider';
import { openExternal } from '@/lib/openExternal';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils';
import {
  VOUCHER_PRICE,
  NO_VOUCHER_PRICE,
  PRINT_PRICE,
  SESSION_PRICE,
  eventTotal,
  voucherCount,
  eventSharing,
  eventStudioNet,
  isPercentMode,
  sessionPrice,
} from '@/lib/photoSession';
import { liveUrl, crewUrl } from '@/lib/appUrls';

export default function AdminSesi() {
  const { prompt, confirm, open } = useModal();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'crew' | 'customer'
  const [copiedKey, setCopiedKey] = useState(null);

  // Quick session input state
  const [noVoucher, setNoVoucher] = useState(false);
  const [prints, setPrints] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      if (supabase && supabase.from) {
        const { data, error } = await supabase
          .from('financial_events')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data && data.length > 0) {
          const formatted = data.map(formatEvent);
          setEvents(formatted);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Sesi events fetch error:', err);
    }

    // Tanpa data contoh: bila belum ada acara, daftar dibiarkan kosong.
    setEvents([]);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        if (supabase && supabase.from) {
          const { data, error } = await supabase
            .from('financial_events')
            .select('*')
            .order('date', { ascending: false });

          if (!ignore && !error && data && data.length > 0) {
            const formatted = data.map(formatEvent);
            setEvents(formatted);
          }
        }
      } catch (err) {
        console.warn('Initial load sesi events error:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleEnterEvent = (ev) => {
    setSelectedEvent(ev);
    setActiveTab('sessions');
  };

  const handleCopy = (url, key) => {
    if (typeof navigator !== 'undefined') {
      const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      navigator.clipboard.writeText(full);
      setCopiedKey(key);
      toast.success('Tautan disalin');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Terapkan hasil server (sesi + pemasukan terbaru) ke state tampilan.
  const applyServerSessions = (result) => {
    const patch = { sessions: result.sessions || [], income: result.income };
    setSelectedEvent((prev) => (prev ? { ...prev, ...patch } : prev));
    setEvents((prev) => prev.map((ev) => (ev.id === selectedEvent.id ? { ...ev, ...patch } : ev)));
  };

  // Pencatatan lewat RPC atomik: tidak menimpa sesi yang dicatat kru pada saat yang sama
  // dan otomatis menghitung ulang pemasukan serta bagi hasil.
  const handleAddSession = async () => {
    if (!selectedEvent) return;
    try {
      const { data, error } = await supabase.rpc('admin_add_session', {
        p_event_id: selectedEvent.id,
        p_id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        p_no_voucher: noVoucher,
        p_prints: prints,
      });
      if (error || !data) throw error || new Error('Sesi ditolak server');
      applyServerSessions(data);
      setNoVoucher(false);
      setPrints(0);
      toast.success('Sesi foto dicatat');
    } catch (err) {
      console.error('Catat sesi gagal:', err);
      toast.error('Gagal mencatat sesi');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!selectedEvent) return;
    try {
      const { data, error } = await supabase.rpc('admin_delete_session', {
        p_event_id: selectedEvent.id,
        p_id: sessionId,
      });
      if (error || !data) throw error || new Error('Penghapusan ditolak server');
      applyServerSessions(data);
      toast.success('Sesi dihapus');
    } catch (err) {
      console.error('Hapus sesi gagal:', err);
      toast.error('Gagal menghapus sesi');
    }
  };

  // Satu pengaturan untuk mode skema, harga, dan bagi hasil. Disimpan ke database lalu pemasukan & bagi hasil dihitung ulang.
  const savePricingConfig = async (values) => {
    const id = selectedEvent.id;
    const { error } = await supabase.from('financial_events').update(values).eq('id', id);
    if (error) throw error;
    const { error: rpcError } = await supabase.rpc('recalc_event_finance', { p_event_id: id });
    if (rpcError) throw rpcError;
    const { data, error: readError } = await supabase.from('financial_events').select('*').eq('id', id).single();
    if (readError) throw readError;
    const fresh = formatEvent(data);
    setSelectedEvent(fresh);
    setEvents((prev) => prev.map((e) => (e.id === id ? fresh : e)));
    toast.success('Pengaturan tersimpan');
  };

  const handleOpenConfig = () => {
    if (!selectedEvent) return;
    open(
      (close) => <PricingConfigModal event={selectedEvent} onClose={close} onSave={savePricingConfig} />,
      { size: 'md', nonDismissible: true }
    );
  };

  // Acara dibuat langsung di database (ID & token dari server), lalu otomatis muncul di Jadwal, Kas, Antrean, dan Sesi.
  const handleCreateEvent = () => {
    open(
      (close) => (
        <NewEventModal
          title="Acara Baru"
          onClose={close}
          onSubmit={async ({ name, date, venue }) => {
            const { data, error } = await supabase
              .from('financial_events')
              .insert([{ name, date, venue }])
              .select()
              .single();
            if (error) throw error;
            const evt = formatEvent(data);
            setEvents((prev) => [evt, ...prev]);
            toast.success('Acara dibuat dan tersambung ke Jadwal & Kas');
            handleEnterEvent(evt);
          }}
        />
      ),
      { size: 'md', nonDismissible: true }
    );
  };

  const filteredEvents = events.filter((ev) =>
    ev.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =========================================================================
  // VIEW 1: EVENT LIST (Daftar Acara Sesi)
  // =========================================================================
  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-ink-900">
              Sesi Foto
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchEvents}
              className="p-2.5 rounded-xl border border-line bg-white hover:bg-bg text-ink-700 transition shadow-2xs cursor-pointer"
              title="Segarkan Data"
            >
              <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={handleCreateEvent}
              className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FiPlus size={16} />
              <span>Tambah Acara</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 text-sm" />
          <input
            type="text"
            placeholder="Cari acara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-line rounded-xl text-xs sm:text-sm font-medium text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-yellow-400 shadow-2xs transition"
          />
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-ink-500">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Memuat daftar acara...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="col-span-full bg-white border border-line rounded-2xl p-12 text-center text-xs text-ink-500">
              Tidak ada acara ditemukan. Klik &quot;Tambah Acara&quot; untuk membuat baru.
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const count = (ev.sessions || []).length;
              const gross = eventTotal(ev);

              return (
                <div
                  key={ev.id}
                  onClick={() => handleEnterEvent(ev)}
                  className="bg-white border border-line hover:border-yellow-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading font-bold text-base text-ink-900 group-hover:text-yellow-600 transition-colors">
                        {ev.name}
                      </h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 shrink-0">
                        {count} Sesi
                      </span>
                    </div>
                    <p className="text-xs tabular-nums text-ink-500 mt-1">
                      {formatDate(ev.date)} • {ev.venue || 'Venue belum diatur'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between">
                    <span className="text-xs tabular-nums font-bold text-ink-900">
                      {formatRupiah(gross)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterEvent(ev);
                      }}
                      className="text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 px-3.5 py-1.5 rounded-lg shadow-2xs transition"
                    >
                      Kelola Sesi
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EVENT WORKSPACE (Masuk ke Acara - SnapHub Style)
  // =========================================================================
  const liveCustomerUrl = liveUrl(selectedEvent);
  const crewInputUrl = crewUrl(selectedEvent);

  const isPercent = isPercentMode(selectedEvent);
  const grossTotal = eventTotal(selectedEvent);
  const totalVouchers = voucherCount(selectedEvent);
  const partnerShareAmount = eventSharing(selectedEvent);
  const studioShareAmount = grossTotal - partnerShareAmount;

  const voucherPrice = selectedEvent.voucher_price || VOUCHER_PRICE;
  const noVoucherPrice = selectedEvent.no_voucher_price || NO_VOUCHER_PRICE;
  const sessionPriceVal = selectedEvent.session_price || SESSION_PRICE;
  const printPrice = selectedEvent.print_price || PRINT_PRICE;
  const calculatedSessionPrice = isPercent
    ? sessionPriceVal + prints * printPrice
    : (noVoucher ? noVoucherPrice : voucherPrice) + prints * printPrice;

  return (
    <div className="space-y-6">
      {/* Top Header with Back Navigation */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedEvent(null)}
            className="p-2 text-ink-700 hover:text-ink-900 bg-bg hover:bg-yellow-50 rounded-xl border border-line transition cursor-pointer"
            title="Kembali ke Daftar Acara"
          >
            <FiArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-ink-900">
              {selectedEvent.name}
            </h2>
            <p className="text-xs tabular-nums text-ink-500 mt-0.5">
              {formatDate(selectedEvent.date)} • Token: {selectedEvent.share_token}
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenConfig}
            className="size-11 shrink-0 flex items-center justify-center rounded-xl border border-line bg-white hover:bg-yellow-50 text-ink-700 transition cursor-pointer"
            aria-label="Pengaturan harga dan bagi hasil"
            title="Pengaturan harga & bagi hasil"
          >
            <FiSettings size={18} />
          </button>
          <button
            type="button"
            onClick={() => openExternal(liveCustomerUrl)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FiCamera size={14} />
            <span>Live Customer</span>
            <FiExternalLink size={12} />
          </button>
          <button
            type="button"
            onClick={() => openExternal(crewInputUrl)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-bg text-ink-700 border border-line shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FiUserCheck size={14} />
            <span>Kru Input</span>
            <FiExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Tabs Inside Event: Catat Sesi | Session Kru | Live Customer */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-yellow-400 text-ink-900 shadow-xs'
              : 'text-ink-700 hover:text-ink-900 hover:bg-yellow-50'
          }`}
        >
          Catat & Riwayat Sesi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('crew')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'crew'
              ? 'bg-yellow-400 text-ink-900 shadow-xs'
              : 'text-ink-700 hover:text-ink-900 hover:bg-yellow-50'
          }`}
        >
          Session Kru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'customer'
              ? 'bg-yellow-400 text-ink-900 shadow-xs'
              : 'text-ink-700 hover:text-ink-900 hover:bg-yellow-50'
          }`}
        >
          Live Customer
        </button>
      </div>

      {/* TAB 1: CATAT & RIWAYAT SESI */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Total Sesi</span>
              <p className="font-heading font-bold text-2xl text-ink-900 mt-1 tabular-nums">
                {(selectedEvent.sessions || []).length}
              </p>
              <span className="text-xs tabular-nums text-ink-500">
                {totalVouchers} Voucher
              </span>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Omzet Kotor</span>
              <p className="font-heading font-bold text-2xl text-ink-900 mt-1 tabular-nums">
                {formatRupiah(grossTotal)}
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Bagi Hasil Mitra</span>
              <p className="font-heading font-bold text-2xl text-amber-700 mt-1 tabular-nums">
                {formatRupiah(partnerShareAmount)}
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Pendapatan Bersih Memoribox</span>
              <p className="font-heading font-bold text-2xl text-emerald-600 mt-1 tabular-nums">
                {formatRupiah(studioShareAmount)}
              </p>
            </div>
          </div>

          {/* Quick Input Bar - Crew Style (No Checkbox) */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
              <div>
                <h3 className="font-heading font-bold text-sm text-ink-900">
                  Input Sesi Foto
                </h3>
              </div>
            </div>

            {/* Custom Input Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Toggle Sesi / Base Price Display */}
              {isPercent ? (
                <div className="md:col-span-5 flex items-center justify-between bg-bg border border-line rounded-xl px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-500 font-medium">Tarif Sesi:</span>
                    <span className="text-xs font-bold tabular-nums text-ink-900 bg-white px-2 py-0.5 rounded border border-line">
                      {formatRupiah(sessionPriceVal)}
                    </span>
                  </div>
                  <span className="text-xs text-amber-700 font-semibold tabular-nums">
                    Mitra {selectedEvent.share_percent || 20}%
                  </span>
                </div>
              ) : (
                <div className="md:col-span-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoVoucher(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      !noVoucher
                        ? 'bg-yellow-400 text-ink-900 border-yellow-500 shadow-xs'
                        : 'bg-bg text-ink-700 border-line hover:bg-yellow-50'
                    }`}
                  >
                    Voucher ({formatRupiah(voucherPrice)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoVoucher(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      noVoucher
                        ? 'bg-ink-900 text-white border-slate-900 shadow-xs'
                        : 'bg-bg text-ink-700 border-line hover:bg-yellow-50'
                    }`}
                  >
                    Non-Voucher ({formatRupiah(noVoucherPrice)})
                  </button>
                </div>
              )}

              {/* Extra Cetak Stepper */}
              <div className="md:col-span-4 flex items-center justify-between bg-bg border border-line rounded-xl px-3 py-1.5">
                <div>
                  <span className="text-xs font-bold text-ink-700 block">Ekstra Cetak</span>
                  <span className="text-xs text-ink-500 tabular-nums">
                    +{formatRupiah(printPrice)} / lembar
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrints((p) => Math.max(0, p - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-line text-ink-700 font-bold flex items-center justify-center hover:bg-yellow-50 shadow-2xs cursor-pointer"
                  >
                    <FiMinus size={13} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-ink-900 tabular-nums">
                    {prints}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrints((p) => p + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-line text-ink-700 font-bold flex items-center justify-center hover:bg-yellow-50 shadow-2xs cursor-pointer"
                  >
                    <FiPlus size={13} />
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={handleAddSession}
                  className="w-full py-2.5 px-4 bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FiPlus size={14} />
                  <span>Catat Sesi ({formatRupiah(calculatedSessionPrice)})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-ink-900">
                Riwayat Sesi Terdata ({selectedEvent.sessions?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-bg text-ink-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Tipe Sesi</th>
                    <th className="py-3 px-4 text-center">Extra Cetak</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(!selectedEvent.sessions || selectedEvent.sessions.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-ink-500">
                        Belum ada sesi foto yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    selectedEvent.sessions.map((sess, idx) => (
                      <tr key={sess.id} className="hover:bg-bg/60 transition">
                        <td className="py-3 px-4 text-center tabular-nums text-ink-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-ink-700">
                          {formatDateTime(sess.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                isPercent
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : sess.no_voucher
                                  ? 'bg-yellow-50 text-ink-700 border border-ink-300'
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}
                            >
                              {isPercent ? 'Sesi Foto' : sess.no_voucher ? 'Non-Voucher' : 'Voucher'}
                            </span>
                            {sess.queue_number && (
                              <span className="px-1.5 py-0.5 rounded-md text-xs tabular-nums font-bold bg-yellow-50 text-yellow-800 border border-yellow-200">
                                Antrean {sess.queue_number}
                              </span>
                            )}
                            {sess.customer_name && (
                              <span className="text-xs text-ink-500 font-medium">
                                ({sess.customer_name})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums font-bold text-ink-700">
                          {sess.prints > 0 ? `+${sess.prints} lembar` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(sess.id)}
                            className="p-1.5 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Hapus Sesi"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SESSION KRU */}
      {activeTab === 'crew' && (
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="font-heading font-bold text-base text-ink-900 pb-3 border-b border-line">
              Session Kru Fotografer & Operator
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg border border-line rounded-xl space-y-2">
                <span className="text-xs font-semibold text-ink-500">Token Session Kru</span>
                <p className="tabular-nums font-bold text-lg text-ink-900">
                  {selectedEvent.crew_token}
                </p>
                <p className="text-xs text-ink-500">
                  Kru dapat menggunakan token ini untuk login di tablet photobooth atau HP kru tanpa akun admin.
                </p>
              </div>

              <div className="p-4 bg-bg border border-line rounded-xl space-y-2">
                <span className="text-xs font-semibold text-ink-500">Tautan Kru Input Foto</span>
                <p className="tabular-nums text-xs text-ink-700 truncate">
                  {crewInputUrl}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(crewInputUrl, 'crew_input')}
                    className="px-3 py-1.5 bg-white border border-line text-xs font-semibold text-ink-700 rounded-lg hover:bg-yellow-50 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiCopy size={13} />
                    <span>Salin Link Kru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternal(crewInputUrl)}
                    className="px-3 py-1.5 bg-yellow-400 text-xs font-bold text-ink-900 rounded-lg hover:bg-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiExternalLink size={13} />
                    <span>Buka Kru Input</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Skema Harga MoU */}
            <div className="pt-4 border-t border-line space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-sm text-ink-900">
                  Skema Harga & Bagi Hasil ({isPercent ? 'Mode Persentase' : 'Mode Voucher'})
                </h4>
                <button
                  type="button"
                  onClick={handleOpenConfig}
                  className="h-11 px-3.5 inline-flex items-center gap-1.5 text-sm font-bold text-ink-900 bg-white hover:bg-yellow-50 rounded-xl border border-line transition cursor-pointer"
                >
                  <FiSettings size={15} />
                  Ubah
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {isPercent ? (
                  <>
                    <div className="p-3 bg-bg rounded-xl border border-line">
                      <span className="text-ink-500 block">Tarif per Sesi</span>
                      <span className="tabular-nums font-bold text-ink-900 text-sm mt-0.5 block">
                        {formatRupiah(sessionPriceVal)}
                      </span>
                    </div>
                    <div className="p-3 bg-bg rounded-xl border border-line">
                      <span className="text-ink-500 block">Biaya Cetak Tambahan</span>
                      <span className="tabular-nums font-bold text-ink-900 text-sm mt-0.5 block">
                        {formatRupiah(printPrice)}
                      </span>
                    </div>
                    <div className="p-3 bg-bg rounded-xl border border-line">
                      <span className="text-ink-500 block">Bagi Hasil Mitra</span>
                      <span className="tabular-nums font-bold text-amber-700 text-sm mt-0.5 block">
                        {selectedEvent.share_percent || 0}% dari Omzet
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-bg rounded-xl border border-line">
                      <span className="text-ink-500 block">Harga Voucher</span>
                      <span className="tabular-nums font-bold text-ink-900 text-sm mt-0.5 block">
                        {formatRupiah(selectedEvent.voucher_price)}
                      </span>
                    </div>
                    <div className="p-3 bg-bg rounded-xl border border-line">
                      <span className="text-ink-500 block">Non-Voucher</span>
                      <span className="tabular-nums font-bold text-ink-900 text-sm mt-0.5 block">
                        {formatRupiah(selectedEvent.no_voucher_price)}
                      </span>
                    </div>
                    <div className="p-3 bg-bg rounded-xl border border-line">
                      <span className="text-ink-500 block">Biaya Cetak Tambahan</span>
                      <span className="tabular-nums font-bold text-ink-900 text-sm mt-0.5 block">
                        {formatRupiah(selectedEvent.print_price)}
                      </span>
                    </div>
                    <div className="p-3 bg-bg rounded-xl border border-line flex flex-col justify-between">
                      <div>
                        <span className="text-ink-500 block">Bagi Hasil Mitra</span>
                        <span className="tabular-nums font-bold text-amber-700 text-sm mt-0.5 block">
                          {formatRupiah(selectedEvent.share_per_voucher)} /voucher
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE CUSTOMER */}
      {activeTab === 'customer' && (
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="font-heading font-bold text-base text-ink-900 pb-3 border-b border-line">
              Live Album Customer & Countdown
            </h3>

            <div className="p-4 bg-bg border border-line rounded-xl space-y-2">
              <span className="text-xs font-semibold text-ink-500">Tautan Live Album Tamu</span>
              <p className="tabular-nums text-xs text-ink-700 truncate">
                {liveCustomerUrl}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopy(liveCustomerUrl, 'live_album')}
                  className="px-3 py-1.5 bg-white border border-line text-xs font-semibold text-ink-700 rounded-lg hover:bg-yellow-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FiCopy size={13} />
                  <span>Salin Link Tamu</span>
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(liveCustomerUrl)}
                  className="px-3 py-1.5 bg-yellow-400 text-xs font-bold text-ink-900 rounded-lg hover:bg-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FiExternalLink size={13} />
                  <span>Buka Live Tamu</span>
                </button>
              </div>
            </div>

            {selectedEvent.drive_url && (
              <div className="p-4 bg-yellow-50/60 border border-yellow-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-yellow-800 block">Folder Google Drive / Cloud Album</span>
                  <p className="tabular-nums text-xs text-ink-700 truncate mt-0.5">
                    {selectedEvent.drive_url}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openExternal(selectedEvent.drive_url)}
                  className="px-3 py-1.5 bg-yellow-400 text-xs font-bold text-ink-900 rounded-lg hover:bg-yellow-300 transition shrink-0 ml-3"
                >
                  Buka Folder
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

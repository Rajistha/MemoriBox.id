'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FiPlus,
  FiExternalLink,
  FiTv,
  FiUserCheck,
  FiCopy,
  FiCheck,
  FiUsers,
  FiRefreshCw,
  FiTrash2,
  FiArrowLeft,
  FiVolume2,
  FiPlay,
  FiSkipForward,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiSettings,
  FiCamera,
  FiLayers,
  FiMinus,
  FiDollarSign,
  FiPercent,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatEvent } from '@/lib/eventModel';
import NewEventModal from '@/components/admin/NewEventModal';
import PricingConfigModal from '@/components/admin/PricingConfigModal';
import { useModal } from '@/components/ui/ModalProvider';
import { openExternal } from '@/lib/openExternal';
import { supabase } from '@/lib/supabase';
import { queueGuestUrl, queueDisplayUrl, queueCrewUrl, queueQrUrl, liveUrl } from '@/lib/appUrls';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/utils';
import { playChime, unlockAudio } from '@/lib/chime';
import {
  VOUCHER_PRICE,
  NO_VOUCHER_PRICE,
  PRINT_PRICE,
  SESSION_PRICE,
  sessionPrice,
  eventTotal,
  voucherCount,
  eventSharing,
  eventStudioNet,
  isPercentMode,
  pricingOf,
} from '@/lib/photoSession';

export default function AdminQueue() {
  const { prompt, confirm, open } = useModal();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Selected event (Masuk ke Event)
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'crew' | 'customer'
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'waiting' | 'called' | 'completed' | 'skipped'

  // Queue state for the selected event
  const [queues, setQueues] = useState([]);
  const [isCalling, setIsCalling] = useState(false);
  const [autoSession, setAutoSession] = useState(true);
  const [isQueueActive, setIsQueueActive] = useState(true);

  // Fetch all events
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
      console.warn('Queue events fetch error:', err);
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
        console.warn('Initial load queue events error:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Antrean acara terpilih langsung dari database (tanpa data contoh).
  const fetchEventQueues = async (event) => {
    if (!event) return;
    try {
      const { data, error } = await supabase
        .from('event_queues')
        .select('*')
        .eq('event_id', event.id)
        .order('seq_number', { ascending: true });
      if (error) throw error;
      setQueues(data || []);
    } catch (err) {
      console.error('Gagal memuat antrean:', err);
      toast.error('Gagal memuat antrean dari database');
      setQueues([]);
    }
  };

  const handleEnterEvent = (ev) => {
    setSelectedEvent(ev);
    setActiveTab('queue');
    fetchEventQueues(ev);
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

  // Queue actions
  const currentCalled = queues.find((q) => q.status === 'called' || q.status === 'serving' || q.status === 'heading');
  const waitingList = queues.filter((q) => q.status === 'waiting');
  const completedList = queues.filter((q) => q.status === 'completed');
  const skippedList = queues.filter((q) => q.status === 'skipped');

  // Helper untuk mencatat antrian selesai langsung ke Sesi Foto & Kas
  const recordSessionFromQueue = async (queueItem) => {
    if (!selectedEvent || !queueItem) return;
    const isPercent = isPercentMode(selectedEvent);
    const newSession = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      queue_number: queueItem.queue_number,
      customer_name: queueItem.customer_name || '',
      no_voucher: !isPercent && !!queueItem.no_voucher,
      prints: queueItem.prints || 0,
      created_at: new Date().toISOString(),
    };
    const currentSessions = Array.isArray(selectedEvent.sessions) ? selectedEvent.sessions : [];
    const updatedSessions = [newSession, ...currentSessions];
    const updatedEvent = { ...selectedEvent, sessions: updatedSessions };
    setSelectedEvent(updatedEvent);
    setEvents((prev) => prev.map((ev) => (ev.id === selectedEvent.id ? updatedEvent : ev)));

    try {
      if (supabase && supabase.from) {
        await supabase
          .from('financial_events')
          .update({ sessions: updatedSessions })
          .eq('id', selectedEvent.id);
      }
    } catch (err) {
      console.warn('Sync queue to sessions error:', err);
    }
  };

  const handleToggleCurrentNoVoucher = (val) => {
    if (!currentCalled) return;
    const updated = queues.map((q) =>
      q.id === currentCalled.id ? { ...q, no_voucher: val } : q
    );
    setQueues(updated);
  };

  const handleChangeCurrentPrints = (delta) => {
    if (!currentCalled) return;
    const cur = currentCalled.prints || 0;
    const next = Math.max(0, cur + delta);
    const updated = queues.map((q) =>
      q.id === currentCalled.id ? { ...q, prints: next } : q
    );
    setQueues(updated);
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

  // 1. Panggil Berikutnya
  const handleCallNext = async () => {
    if (waitingList.length === 0) {
      toast.error('Tidak ada antrean yang menunggu.');
      return;
    }
    setIsCalling(true);
    unlockAudio();
    playChime();

    const prevCalled = currentCalled ? { ...currentCalled } : null;
    const nextQueue = waitingList[0];

    // Mark previous current as completed
    const updated = queues.map((q) => {
      if (currentCalled && q.id === currentCalled.id) {
        return { ...q, status: 'completed', completed_at: new Date().toISOString() };
      }
      if (q.id === nextQueue.id) {
        return { ...q, status: 'called', called_at: new Date().toISOString() };
      }
      return q;
    });

    setQueues(updated);
    setIsCalling(false);
    toast.success(`Memanggil nomor ${nextQueue.queue_number}`);

    // Otomatis catat sesi untuk antrean sebelumnya yang baru saja selesai
    if (prevCalled && autoSession) {
      await recordSessionFromQueue(prevCalled);
    }

    // Sync to Supabase
    try {
      if (supabase && supabase.from) {
        if (prevCalled) {
          await supabase.from('event_queues').update({ status: 'completed' }).eq('id', prevCalled.id);
        }
        await supabase.from('event_queues').update({ status: 'called', called_at: new Date().toISOString() }).eq('id', nextQueue.id);
      }
    } catch {}
  };

  // 2. Panggil Ulang
  const handleRecall = () => {
    if (!currentCalled) {
      toast.error('Belum ada nomor yang sedang dipanggil.');
      return;
    }
    unlockAudio();
    playChime();
    toast.success(`Panggil ulang nomor ${currentCalled.queue_number}`);
  };

  // 3. Selesaikan
  const handleCompleteCurrent = async () => {
    if (!currentCalled) return;
    const finishedItem = { ...currentCalled };
    const updated = queues.map((q) =>
      q.id === currentCalled.id ? { ...q, status: 'completed', completed_at: new Date().toISOString() } : q
    );
    setQueues(updated);

    if (autoSession) {
      await recordSessionFromQueue(finishedItem);
      toast.success(`Nomor ${finishedItem.queue_number} selesai & dicatat ke sesi foto`);
    } else {
      toast.success(`Nomor ${finishedItem.queue_number} selesai`);
    }

    try {
      if (supabase && supabase.from) {
        await supabase.from('event_queues').update({ status: 'completed' }).eq('id', finishedItem.id);
      }
    } catch {}
  };

  // 4. Lewati / Skip
  const handleSkipCurrent = async () => {
    if (!currentCalled) return;
    const updated = queues.map((q) =>
      q.id === currentCalled.id ? { ...q, status: 'skipped' } : q
    );
    setQueues(updated);
    toast.success(`Nomor ${currentCalled.queue_number} dilewati`);

    try {
      if (supabase && supabase.from) {
        await supabase.from('event_queues').update({ status: 'skipped' }).eq('id', currentCalled.id);
      }
    } catch {}
  };

  // 5. Tambah Antrean Manual
  const handleAddManualQueue = async () => {
    const name = await prompt({
      title: 'Tambah Tamu Antrean',
      placeholder: 'Nama Tamu / Rombongan (contoh: Jessica & Teman)',
      required: true,
    });
    if (!name || !name.trim()) return;

    const nextSeq = queues.length + 1;
    const padNum = String(nextSeq).padStart(2, '0');
    const newQueueNum = `A-${padNum}`;

    const newTicket = {
      id: `q-${Date.now()}`,
      event_id: selectedEvent.id,
      queue_number: newQueueNum,
      seq_number: nextSeq,
      customer_name: name.trim(),
      status: 'waiting',
      created_at: new Date().toISOString(),
    };

    setQueues([...queues, newTicket]);
    toast.success(`Tiket ${newQueueNum} berhasil diterbitkan`);

    try {
      if (supabase && supabase.from) {
        await supabase.from('event_queues').insert({
          event_id: selectedEvent.id,
          queue_number: newQueueNum,
          seq_number: nextSeq,
          customer_name: name.trim(),
          status: 'waiting',
        });
      }
    } catch {}
  };

  // 6. Reset Antrean
  const handleResetQueue = async () => {
    const ok = await confirm({
      title: 'Reset Antrean Acara',
      message: `Apakah Anda yakin ingin mengosongkan seluruh antrean untuk ${selectedEvent.name}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Reset',
      tone: 'danger',
    });
    if (!ok) return;

    setQueues([]);
    toast.success('Antrean berhasil direset');

    try {
      if (supabase && supabase.from) {
        await supabase.from('event_queues').delete().eq('event_id', selectedEvent.id);
      }
    } catch {}
  };

  // Create New Event
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

  // Filtered Queue List
  const filteredQueues = queues.filter((q) => {
    if (queueFilter === 'waiting') return q.status === 'waiting';
    if (queueFilter === 'called') return q.status === 'called' || q.status === 'serving' || q.status === 'heading';
    if (queueFilter === 'completed') return q.status === 'completed';
    if (queueFilter === 'skipped') return q.status === 'skipped';
    return true;
  });

  const filteredEvents = events.filter((ev) =>
    ev.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =========================================================================
  // VIEW 1: EVENT LIST (Daftar Acara)
  // =========================================================================
  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-ink-900">
              Antrean
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
            filteredEvents.map((ev) => (
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
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs tabular-nums text-ink-500 mt-1">
                    {formatDate(ev.date)} • {ev.venue || 'Venue belum diatur'}
                  </p>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-xs tabular-nums text-ink-500">
                    Token: {ev.queue_token}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnterEvent(ev);
                    }}
                    className="text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 px-3.5 py-1.5 rounded-lg shadow-2xs transition"
                  >
                    Kelola Antrean
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EVENT WORKSPACE (Masuk ke Acara - SnapHub Style)
  // =========================================================================
  const tvUrl = queueDisplayUrl(selectedEvent);
  const qrUrl = queueQrUrl(selectedEvent);
  const guestUrl = queueGuestUrl(selectedEvent);
  const crewUrlLink = queueCrewUrl(selectedEvent);
  const liveCustomerUrl = liveUrl(selectedEvent);

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
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold font-heading text-ink-900">
                {selectedEvent.name}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {isQueueActive ? 'Antrean Dibuka' : 'Antrean Ditutup'}
              </span>
            </div>
            <p className="text-xs tabular-nums text-ink-500 mt-0.5">
              {formatDate(selectedEvent.date)} • Token: {selectedEvent.queue_token}
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
            onClick={() => setIsQueueActive(!isQueueActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              isQueueActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isQueueActive ? 'Tutup Antrean' : 'Buka Antrean'}
          </button>
          <button
            type="button"
            onClick={() => fetchEventQueues(selectedEvent)}
            className="p-2 rounded-xl border border-line bg-white hover:bg-bg text-ink-700 transition shadow-2xs cursor-pointer"
            title="Segarkan Data"
          >
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 4 Quick Access Links to Display TV, QR Kiosk, Guest Ticket, and Crew Terminal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Layar TV */}
        <div className="p-3 bg-white border border-line rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0">
              <FiTv size={14} />
            </div>
            <span className="text-xs font-bold text-ink-900 truncate">Layar TV</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(tvUrl, 'tv')}
              className="p-1.5 text-ink-500 hover:text-ink-700 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Salin Link"
            >
              {copiedKey === 'tv' ? <FiCheck size={13} className="text-emerald-600" /> : <FiCopy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => openExternal(tvUrl)}
              className="p-1.5 text-ink-700 hover:text-ink-900 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Buka Layar TV"
            >
              <FiExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Kios QR */}
        <div className="p-3 bg-white border border-line rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0">
              <FiUsers size={14} />
            </div>
            <span className="text-xs font-bold text-ink-900 truncate">Kios QR</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(qrUrl, 'qr')}
              className="p-1.5 text-ink-500 hover:text-ink-700 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Salin Link"
            >
              {copiedKey === 'qr' ? <FiCheck size={13} className="text-emerald-600" /> : <FiCopy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => openExternal(qrUrl)}
              className="p-1.5 text-ink-700 hover:text-ink-900 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Buka Kios QR"
            >
              <FiExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Tiket Tamu */}
        <div className="p-3 bg-white border border-line rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0">
              <FiCopy size={14} />
            </div>
            <span className="text-xs font-bold text-ink-900 truncate">Tiket Tamu</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(guestUrl, 'guest')}
              className="p-1.5 text-ink-500 hover:text-ink-700 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Salin Link"
            >
              {copiedKey === 'guest' ? <FiCheck size={13} className="text-emerald-600" /> : <FiCopy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => openExternal(guestUrl)}
              className="p-1.5 text-ink-700 hover:text-ink-900 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Buka Tiket Tamu"
            >
              <FiExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Terminal Kru */}
        <div className="p-3 bg-white border border-line rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0">
              <FiUserCheck size={14} />
            </div>
            <span className="text-xs font-bold text-ink-900 truncate">Terminal Kru</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(crewUrlLink, 'crew')}
              className="p-1.5 text-ink-500 hover:text-ink-700 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Salin Link"
            >
              {copiedKey === 'crew' ? <FiCheck size={13} className="text-emerald-600" /> : <FiCopy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => openExternal(crewUrlLink)}
              className="p-1.5 text-ink-700 hover:text-ink-900 rounded-lg hover:bg-bg transition cursor-pointer"
              title="Buka Terminal Kru"
            >
              <FiExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Inside Event: Kontrol Antrean | Session Kru | Live Customer */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-yellow-400 text-ink-900 shadow-xs'
              : 'text-ink-700 hover:text-ink-900 hover:bg-yellow-50'
          }`}
        >
          Kontrol Antrean
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

      {/* TAB 1: KONTROL ANTREAN */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Main Calling Box (Papan Panggilan Utama) */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col gap-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider block">
                  Sedang Dipanggil
                </span>
                <div className="flex items-baseline justify-center md:justify-start gap-3 mt-1">
                  <span className="font-heading font-bold text-5xl sm:text-6xl text-ink-900 tabular-nums tracking-tight">
                    {currentCalled ? currentCalled.queue_number : '--'}
                  </span>
                  {currentCalled && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      {currentCalled.customer_name || 'Tamu Booth'}
                    </span>
                  )}
                </div>
              </div>

              {/* Calling Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={waitingList.length === 0 || isCalling}
                  className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold px-5 py-3 rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FiPlay size={16} />
                  <span>Panggil Berikutnya</span>
                </button>

                <button
                  type="button"
                  onClick={handleRecall}
                  disabled={!currentCalled}
                  className="bg-white hover:bg-bg text-ink-700 font-semibold border border-line px-4 py-3 rounded-xl shadow-2xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FiVolume2 size={16} className="text-yellow-600" />
                  <span>Panggil Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteCurrent}
                  disabled={!currentCalled}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 px-4 py-3 rounded-xl shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FiCheckCircle size={16} />
                  <span>Selesai</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipCurrent}
                  disabled={!currentCalled}
                  className="bg-bg hover:bg-yellow-50 text-ink-700 font-semibold border border-line px-4 py-3 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FiSkipForward size={16} />
                  <span>Lewati</span>
                </button>
              </div>
            </div>

            {/* Live Session Configuration for Currently Called Ticket */}
            {currentCalled && (
              <div className="pt-4 border-t border-line bg-bg/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {!isPercentMode(selectedEvent) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink-700">Jenis:</span>
                      <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleCurrentNoVoucher(false)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                            !currentCalled.no_voucher
                              ? 'bg-yellow-400 text-ink-900 shadow-2xs'
                              : 'text-ink-700 hover:text-ink-900'
                          }`}
                        >
                          Voucher ({formatRupiah(selectedEvent.voucher_price || VOUCHER_PRICE)})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCurrentNoVoucher(true)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                            currentCalled.no_voucher
                              ? 'bg-ink-900 text-white shadow-2xs'
                              : 'text-ink-700 hover:text-ink-900'
                          }`}
                        >
                          Non-Voucher ({formatRupiah(selectedEvent.no_voucher_price || NO_VOUCHER_PRICE)})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink-700">Tarif Sesi:</span>
                      <span className="text-xs font-bold tabular-nums text-ink-900 bg-white px-2.5 py-1 rounded-md border border-line">
                        {formatRupiah(selectedEvent.session_price || SESSION_PRICE)}
                      </span>
                    </div>
                  )}

                  {/* Extra Prints Stepper */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-700">Extra Print:</span>
                    <div className="flex items-center border border-line rounded-lg bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleChangeCurrentPrints(-1)}
                        disabled={!currentCalled.prints || currentCalled.prints <= 0}
                        className="w-7 h-7 flex items-center justify-center text-ink-700 hover:bg-yellow-50 disabled:opacity-40 transition cursor-pointer"
                      >
                        <FiMinus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold tabular-nums text-ink-900">
                        {currentCalled.prints || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChangeCurrentPrints(1)}
                        className="w-7 h-7 flex items-center justify-center text-ink-700 hover:bg-yellow-50 transition cursor-pointer"
                      >
                        <FiPlus size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-ink-500 tabular-nums">
                      (@{formatRupiah(selectedEvent.print_price || PRINT_PRICE)})
                    </span>
                  </div>
                </div>

                {/* Live total estimation & auto-session checkbox */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-ink-500 uppercase font-semibold block">Total Sesi Ini</span>
                    <span className="text-sm font-bold tabular-nums text-emerald-700">
                      {formatRupiah(sessionPrice(currentCalled, selectedEvent))}
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-ink-700 cursor-pointer pl-3 border-l border-line">
                    <input
                      type="checkbox"
                      checked={autoSession}
                      onChange={(e) => setAutoSession(e.target.checked)}
                      className="rounded border-ink-300 text-yellow-800 focus:ring-yellow-400"
                    />
                    <span>Catat ke Sesi</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 4 Financial & Session Summary Cards (SnapHub Style) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Total Sesi Foto</span>
                <span className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-700 flex items-center justify-center">
                  <FiCamera size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-2xl text-ink-900 mt-2 tabular-nums">
                {(selectedEvent.sessions || []).length}
              </p>
              <p className="text-xs text-ink-500 mt-0.5 tabular-nums">
                {voucherCount(selectedEvent)} voucher terpakai
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Omzet Kotor Sesi</span>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FiDollarSign size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-xl sm:text-2xl text-emerald-600 mt-2 tabular-nums">
                {formatRupiah(eventTotal(selectedEvent))}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                Semua sesi terdata
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Bagi Hasil Mitra</span>
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <FiPercent size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-xl sm:text-2xl text-amber-700 mt-2 tabular-nums">
                {formatRupiah(eventSharing(selectedEvent))}
              </p>
              <p className="text-xs text-ink-500 mt-0.5 tabular-nums">
                {isPercentMode(selectedEvent)
                  ? `${selectedEvent.share_percent || 20}% dari omzet kotor`
                  : `@${formatRupiah(selectedEvent.share_per_voucher || 0)} / voucher`}
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Laba Bersih</span>
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <FiDollarSign size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-xl sm:text-2xl text-indigo-700 mt-2 tabular-nums">
                {formatRupiah(eventStudioNet(selectedEvent))}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                Omzet dikurangi bagi hasil
              </p>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Dipanggil</span>
              <p className="font-heading font-bold text-2xl text-ink-900 mt-1 tabular-nums">
                {currentCalled ? '1' : '0'}
              </p>
            </div>
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Menunggu</span>
              <p className="font-heading font-bold text-2xl text-yellow-600 mt-1 tabular-nums">
                {waitingList.length}
              </p>
            </div>
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Selesai</span>
              <p className="font-heading font-bold text-2xl text-emerald-600 mt-1 tabular-nums">
                {completedList.length}
              </p>
            </div>
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-ink-500">Dilewati</span>
              <p className="font-heading font-bold text-2xl text-ink-500 mt-1 tabular-nums">
                {skippedList.length}
              </p>
            </div>
          </div>

          {/* Action Row & Queue List Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: `Semua (${queues.length})` },
                { id: 'waiting', label: `Menunggu (${waitingList.length})` },
                { id: 'called', label: `Dipanggil (${currentCalled ? 1 : 0})` },
                { id: 'completed', label: `Selesai (${completedList.length})` },
                { id: 'skipped', label: `Dilewati (${skippedList.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setQueueFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    queueFilter === f.id
                      ? 'bg-ink-900 text-white'
                      : 'bg-white text-ink-700 border border-line hover:bg-bg'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAddManualQueue}
                className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiPlus size={15} />
                <span>Tambah Antrean</span>
              </button>
              <button
                type="button"
                onClick={handleResetQueue}
                className="bg-white hover:bg-red-50 text-ink-700 hover:text-red-600 border border-line font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Reset Antrean"
              >
                <FiTrash2 size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Queue Table */}
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-bg text-ink-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nomor Antrean</th>
                    <th className="py-3 px-4">Nama Tamu</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredQueues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-ink-500">
                        Tidak ada antrean dalam kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredQueues.map((q, idx) => (
                      <tr key={q.id} className="hover:bg-bg/60 transition">
                        <td className="py-3 px-4 text-center tabular-nums text-ink-500">{idx + 1}</td>
                        <td className="py-3 px-4 tabular-nums font-bold text-base text-ink-900">
                          {q.queue_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink-700">
                          {q.customer_name || 'Tamu Mandiri'}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-ink-500">
                          {formatDateTime(q.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              q.status === 'called'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : q.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : q.status === 'skipped'
                                ? 'bg-yellow-50 text-ink-700 border border-line'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {q.status === 'called'
                              ? 'Dipanggil'
                              : q.status === 'completed'
                              ? 'Selesai'
                              : q.status === 'skipped'
                              ? 'Dilewati'
                              : 'Menunggu'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {q.status === 'waiting' && (
                            <button
                              type="button"
                              onClick={() => {
                                unlockAudio();
                                playChime();
                                const updated = queues.map((it) => (it.id === q.id ? { ...it, status: 'called' } : it));
                                setQueues(updated);
                                toast.success(`Memanggil ${q.queue_number}`);
                              }}
                              className="text-xs font-bold text-ink-900 bg-yellow-400 hover:bg-yellow-300 px-3 py-1 rounded-lg shadow-2xs transition"
                            >
                              Panggil
                            </button>
                          )}
                          {q.status === 'called' && (
                            <button
                              type="button"
                              onClick={handleCompleteCurrent}
                              className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-lg transition"
                            >
                              Selesaikan
                            </button>
                          )}
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
              Session Akses Kru Booth
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg border border-line rounded-xl space-y-2">
                <span className="text-xs font-semibold text-ink-500">Token Session Kru</span>
                <p className="tabular-nums font-bold text-lg text-ink-900">
                  {selectedEvent.queue_crew_token}
                </p>
                <p className="text-xs text-ink-500">
                  Gunakan token ini untuk otentikasi kru tanpa memerlukan akun super admin.
                </p>
              </div>

              <div className="p-4 bg-bg border border-line rounded-xl space-y-2">
                <span className="text-xs font-semibold text-ink-500">Tautan Terminal Kru</span>
                <p className="tabular-nums text-xs text-ink-700 truncate">
                  {crewUrlLink}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(crewUrlLink, 'crew_tab')}
                    className="px-3 py-1.5 bg-white border border-line text-xs font-semibold text-ink-700 rounded-lg hover:bg-yellow-50 transition flex items-center gap-1.5"
                  >
                    <FiCopy size={13} />
                    <span>Salin Link Kru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternal(crewUrlLink)}
                    className="px-3 py-1.5 bg-yellow-400 text-xs font-bold text-ink-900 rounded-lg hover:bg-yellow-300 transition flex items-center gap-1.5"
                  >
                    <FiExternalLink size={13} />
                    <span>Buka Terminal Kru</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-between">
              <div>
                <h4 className="font-heading font-bold text-sm text-ink-900">
                  Otomatis Catat Sesi Foto
                </h4>
                <p className="text-xs text-ink-500">
                  Saat kru menyelesaikan antrean, sesi foto otomatis dicatat ke pembukuan kas.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSession}
                  onChange={(e) => setAutoSession(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-yellow-50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE CUSTOMER */}
      {activeTab === 'customer' && (
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="font-heading font-bold text-base text-ink-900 pb-3 border-b border-line">
              Live Album & Countdown Customer
            </h3>

            <div className="p-4 bg-bg border border-line rounded-xl space-y-2">
              <span className="text-xs font-semibold text-ink-500">Tautan Live Album Publik</span>
              <p className="tabular-nums text-xs text-ink-700 truncate">
                {liveCustomerUrl}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopy(liveCustomerUrl, 'live_tab')}
                  className="px-3 py-1.5 bg-white border border-line text-xs font-semibold text-ink-700 rounded-lg hover:bg-yellow-50 transition flex items-center gap-1.5"
                >
                  <FiCopy size={13} />
                  <span>Salin Link Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(liveCustomerUrl)}
                  className="px-3 py-1.5 bg-yellow-400 text-xs font-bold text-ink-900 rounded-lg hover:bg-yellow-300 transition flex items-center gap-1.5"
                >
                  <FiExternalLink size={13} />
                  <span>Buka Live Customer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

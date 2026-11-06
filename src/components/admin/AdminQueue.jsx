'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus,
  FiExternalLink,
  FiTv,
  FiUserCheck,
  FiCopy,
  FiCheck,
  FiUsers,
  FiRefreshCw,
  FiArrowLeft,
  FiSearch,
  FiSettings,
  FiCamera,
  FiDollarSign,
  FiPercent,
  FiChevronRight,
  FiRotateCcw,
  FiSlash,
} from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import toast from 'react-hot-toast';
import { formatEvent } from '@/lib/eventModel';
import NewEventModal from '@/components/admin/NewEventModal';
import PricingConfigModal from '@/components/admin/PricingConfigModal';
import QueueConsole from '@/components/queue/QueueConsole';
import { useModal } from '@/components/ui/ModalProvider';
import { usePolling } from '@/lib/usePolling';
import { openExternal } from '@/lib/openExternal';
import { supabase } from '@/lib/supabase';
import { queueGuestUrl, queueDisplayUrl, queueCrewUrl, queueQrUrl, liveUrl, daysUntil, todayString, newToken, MONTHS } from '@/lib/appUrls';
import { formatDate, formatRupiah } from '@/lib/utils';
import { eventTotal, voucherCount, eventSharing, eventStudioNet, isPercentMode } from '@/lib/photoSession';

// Kolom ringan untuk daftar acara (tanpa JSON sesi yang besar); baris lengkap dimuat saat acara dibuka.
const LIST_COLUMNS =
  'id,name,date,venue,queue_token,queue_slug,queue_crew_token,share_token,crew_token,pricing_mode,voucher_price,no_voucher_price,session_price,print_price,share_per_voucher,share_percent';

const TABS = [
  { id: 'queue', label: 'Kontrol Antrean' },
  { id: 'access', label: 'Tautan & Akses' },
];

const iconBtn =
  'shrink-0 size-11 flex items-center justify-center rounded-xl border border-line bg-white hover:bg-yellow-50 text-ink-700 transition cursor-pointer';

export default function AdminQueue() {
  const { open, confirm } = useModal();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('financial_events')
        .select(LIST_COLUMNS)
        .order('date', { ascending: false });
      if (error) throw error;
      setEvents((data || []).map(formatEvent));
    } catch (err) {
      console.warn('Queue events fetch error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchEvents();
    };
    init();
  }, [fetchEvents]);

  // Muat baris lengkap (termasuk sesi) agar kartu keuangan akurat; dipanggil saat masuk acara dan tiap sesi tercatat.
  const reloadSelected = useCallback(async (id) => {
    const { data, error } = await supabase.from('financial_events').select('*').eq('id', id).single();
    if (error || !data) return null;
    const fresh = formatEvent(data);
    setSelectedEvent((prev) => (prev && prev.id === id ? fresh : prev));
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...fresh, sessions: undefined } : e)));
    return fresh;
  }, []);

  // Kartu keuangan ikut berubah saat kru menyelesaikan tamu dari terminal mereka (tidak hanya dari panel ini).
  usePolling(() => selectedEvent && reloadSelected(selectedEvent.id), 8000, !!selectedEvent);

  const handleEnterEvent = (ev) => {
    setSelectedEvent(ev);
    setActiveTab('queue');
    reloadSelected(ev.id);
  };

  const handleCopy = async (url, key) => {
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedKey(key);
      toast.success('Tautan disalin');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  // Ubah token akses di database lalu sinkronkan ke state. Tautan lama langsung tidak berlaku.
  const updateToken = async (patch, okMessage) => {
    const id = selectedEvent.id;
    const { error } = await supabase.from('financial_events').update(patch).eq('id', id);
    if (error) {
      toast.error('Gagal memperbarui tautan: ' + (error.message || 'Error'));
      return false;
    }
    setSelectedEvent((prev) => (prev ? { ...prev, ...patch } : prev));
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    toast.success(okMessage);
    return true;
  };

  const enableCrewLink = () => updateToken({ queue_crew_token: newToken() }, 'Link kru diaktifkan');

  const regenerateCrewLink = async () => {
    const ok = await confirm({
      title: 'Buat ulang link kru?',
      message: 'Link kru yang sudah dibagikan langsung tidak berlaku. Kirim link baru ke kru booth.',
      confirmText: 'Buat ulang',
    });
    if (ok) updateToken({ queue_crew_token: newToken() }, 'Link kru baru dibuat');
  };

  const disableCrewLink = async () => {
    const ok = await confirm({
      title: 'Nonaktifkan link kru?',
      message: 'Kru tidak bisa lagi membuka terminal sampai link diaktifkan kembali. Panel admin ini tetap berfungsi.',
      confirmText: 'Nonaktifkan',
      tone: 'danger',
    });
    if (ok) updateToken({ queue_crew_token: null }, 'Link kru dinonaktifkan');
  };

  const regenerateGuestLink = async () => {
    const ok = await confirm({
      title: 'Buat ulang link antrean tamu?',
      message: 'QR dan link tamu yang sudah dibagikan tidak berlaku lagi. Cetak ulang atau bagikan QR yang baru.',
      confirmText: 'Buat ulang',
      tone: 'danger',
    });
    if (ok) updateToken({ queue_token: newToken() }, 'Link tamu baru dibuat. QR lama tidak berlaku.');
  };

  // Bagikan tautan lewat WhatsApp (pengguna memilih kontak/grup sendiri di aplikasi WhatsApp).
  const shareWhatsApp = (label, url) => {
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    const text = `${label} ${selectedEvent?.name || ''}\n${full}`.trim();
    openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  // Satu pengaturan untuk mode skema, harga, dan bagi hasil. Disimpan ke database lalu pemasukan & bagi hasil dihitung ulang.
  const savePricingConfig = async (values) => {
    const id = selectedEvent.id;
    const { error } = await supabase.from('financial_events').update(values).eq('id', id);
    if (error) throw error;
    const { error: rpcError } = await supabase.rpc('recalc_event_finance', { p_event_id: id });
    if (rpcError) throw rpcError;
    const fresh = await reloadSelected(id);
    if (!fresh) throw new Error('Gagal memuat ulang acara');
    toast.success('Pengaturan tersimpan');
  };

  const handleOpenConfig = () => {
    if (!selectedEvent) return;
    open((close) => <PricingConfigModal event={selectedEvent} onClose={close} onSave={savePricingConfig} />, {
      size: 'md',
      nonDismissible: true,
    });
  };

  // Acara dibuat langsung di database (ID & token dari server), lalu otomatis muncul di Jadwal, Kas, Antrean, dan Sesi.
  const handleCreateEvent = () => {
    open(
      (close) => (
        <NewEventModal
          title="Acara Baru"
          onClose={close}
          onSubmit={async ({ name, date, venue }) => {
            const { data, error } = await supabase.from('financial_events').insert([{ name, date, venue }]).select().single();
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

  const today = todayString();
  const eventGroups = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const filtered = events.filter((ev) => (ev.name || '').toLowerCase().includes(needle));
    return [
      {
        key: 'upcoming',
        title: 'Akan datang',
        dim: false,
        list: filtered.filter((e) => (e.date || '') >= today).sort((a, b) => (a.date || '').localeCompare(b.date || '')),
      },
      {
        key: 'past',
        title: 'Sudah lewat',
        dim: true,
        list: filtered.filter((e) => (e.date || '') < today).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      },
    ];
  }, [events, searchQuery, today]);

  // =========================================================================
  // VIEW 1: DAFTAR ACARA (dikelompokkan Akan datang / Sudah lewat, seperti SnapHub)
  // =========================================================================
  if (!selectedEvent) {
    const hasAny = eventGroups.some((g) => g.list.length > 0);
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-ink-900">Antrean</h2>
          <div className="flex items-center gap-2 overflow-x-auto shrink-0">
            <button type="button" onClick={fetchEvents} className={iconBtn} aria-label="Segarkan data">
              <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={handleCreateEvent}
              className="shrink-0 min-h-11 bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold text-sm px-4 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FiPlus size={16} />
              <span>Tambah Acara</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 text-sm" aria-hidden="true" />
          <input
            type="search"
            aria-label="Cari acara"
            placeholder="Cari acara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-11 pl-10 pr-4 bg-white border border-line rounded-xl text-sm font-medium text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-yellow-500 shadow-2xs transition"
          />
        </div>

        {loading ? (
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-18 animate-pulse bg-bg/60" />
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-white border border-line rounded-2xl p-10 text-center">
            <p className="text-sm font-semibold text-ink-900">Gagal memuat daftar acara</p>
            <button
              type="button"
              onClick={fetchEvents}
              className="mt-3 min-h-11 px-4 rounded-xl border border-line bg-white text-xs font-bold text-ink-700 hover:bg-bg cursor-pointer"
            >
              Coba lagi
            </button>
          </div>
        ) : !hasAny ? (
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-sm text-ink-500">
            {events.length === 0 ? 'Belum ada acara. Klik "Tambah Acara" untuk membuat baru.' : 'Tidak ada acara yang cocok.'}
          </div>
        ) : (
          eventGroups.map(
            (group) =>
              group.list.length > 0 && (
                <section key={group.key}>
                  <h3 className="text-sm font-semibold text-ink-500 mb-2 px-1">
                    {group.title} · {group.list.length}
                  </h3>
                  <ul className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden shadow-xs">
                    {group.list.map((ev) => {
                      const d = ev.date && !group.dim ? daysUntil(ev.date, today) : null;
                      return (
                        <li key={ev.id}>
                          <button
                            type="button"
                            onClick={() => handleEnterEvent(ev)}
                            className="w-full min-h-18 flex items-center gap-4 text-left px-4 py-3 hover:bg-yellow-50/60 transition-colors cursor-pointer"
                          >
                            <div className="w-11 shrink-0 text-center leading-none">
                              <div className="text-lg font-bold tabular-nums text-ink-900">
                                {ev.date ? Number(ev.date.slice(8, 10)) : '–'}
                              </div>
                              <div className="text-xs text-ink-500 mt-1">
                                {ev.date ? MONTHS[Number(ev.date.slice(5, 7)) - 1] : ''}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-semibold truncate ${group.dim ? 'text-ink-500' : 'text-ink-900'}`}>{ev.name}</p>
                              <p className="text-xs text-ink-500 truncate">
                                {d !== null && (d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : `${d} hari lagi`)}
                                {d !== null && ev.venue ? ' • ' : ''}
                                {ev.venue || (d === null ? 'Venue belum diatur' : '')}
                              </p>
                            </div>
                            <FiChevronRight className="text-ink-500 shrink-0" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )
          )
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: RUANG KERJA ACARA
  // =========================================================================
  const tvUrl = queueDisplayUrl(selectedEvent);
  const qrUrl = queueQrUrl(selectedEvent);
  const guestUrl = queueGuestUrl(selectedEvent);
  // queueCrewUrl akan jatuh ke token lain bila token kru kosong, jadi tautan hanya dibuat saat token kru ada.
  const crewUrlLink = selectedEvent.queue_crew_token ? queueCrewUrl(selectedEvent) : '';
  const liveCustomerUrl = liveUrl(selectedEvent);

  const quickLinks = [
    { key: 'tv', label: 'Layar TV', icon: <FiTv size={14} />, url: tvUrl },
    { key: 'qr', label: 'Kios QR', icon: <FiUsers size={14} />, url: qrUrl },
    { key: 'guest', label: 'Tiket Tamu', icon: <FiCopy size={14} />, url: guestUrl },
    { key: 'crew', label: 'Terminal Kru', icon: <FiUserCheck size={14} />, url: crewUrlLink },
  ].filter((l) => l.url);

  const percentMode = isPercentMode(selectedEvent);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header: kembali + judul di kiri, aksi utama di kanan (tidak membungkus) */}
      <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => setSelectedEvent(null)} className={iconBtn} aria-label="Kembali ke daftar acara">
            <FiArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold font-heading text-ink-900 truncate">{selectedEvent.name}</h2>
            <p className="text-xs tabular-nums text-ink-500 mt-0.5">{formatDate(selectedEvent.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <button type="button" onClick={handleOpenConfig} className={iconBtn} aria-label="Pengaturan harga dan bagi hasil">
            <FiSettings size={18} />
          </button>
        </div>
      </div>

      {/* Akses cepat: satu baris yang bisa digeser, tiap kartu = salin + buka */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {quickLinks.map((l) => (
          <div
            key={l.key}
            className="shrink-0 min-w-50 flex-1 p-2 pl-3 bg-white border border-line rounded-xl flex items-center justify-between gap-2 shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0">{l.icon}</span>
              <span className="text-xs font-bold text-ink-900 truncate">{l.label}</span>
            </div>
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(l.url, l.key)}
                className="size-11 flex items-center justify-center rounded-lg text-ink-500 hover:text-ink-900 hover:bg-bg transition cursor-pointer"
                aria-label={`Salin tautan ${l.label}`}
              >
                {copiedKey === l.key ? <FiCheck size={15} className="text-emerald-600" /> : <FiCopy size={15} />}
              </button>
              <button
                type="button"
                onClick={() => openExternal(l.url)}
                className="size-11 flex items-center justify-center rounded-lg text-ink-700 hover:text-ink-900 hover:bg-bg transition cursor-pointer"
                aria-label={`Buka ${l.label}`}
              >
                <FiExternalLink size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-line pb-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 min-h-11 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === t.id ? 'bg-yellow-500 text-ink-900 shadow-xs' : 'text-ink-700 hover:text-ink-900 hover:bg-yellow-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Admin memakai 'admin:<id>' (hanya sah untuk user login) sehingga tidak bergantung pada link kru. */}
          <QueueConsole
            key={selectedEvent.id}
            token={`admin:${selectedEvent.id}`}
            onSessionsChanged={() => reloadSelected(selectedEvent.id)}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Total Sesi Foto</span>
                <span className="size-7 rounded-lg bg-yellow-50 text-yellow-800 flex items-center justify-center">
                  <FiCamera size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-2xl text-ink-900 mt-2 tabular-nums">{(selectedEvent.sessions || []).length}</p>
              <p className="text-xs text-ink-500 mt-0.5 tabular-nums">{voucherCount(selectedEvent)} voucher terpakai</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Omzet Kotor Sesi</span>
                <span className="size-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FiDollarSign size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-xl sm:text-2xl text-emerald-700 mt-2 tabular-nums">
                {formatRupiah(eventTotal(selectedEvent))}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">Semua sesi terdata</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Bagi Hasil Mitra</span>
                <span className="size-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <FiPercent size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-xl sm:text-2xl text-amber-700 mt-2 tabular-nums">
                {formatRupiah(eventSharing(selectedEvent))}
              </p>
              <p className="text-xs text-ink-500 mt-0.5 tabular-nums">
                {percentMode
                  ? `${selectedEvent.share_percent || 20}% dari omzet kotor`
                  : `@${formatRupiah(selectedEvent.share_per_voucher || 0)} / voucher`}
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Laba Bersih</span>
                <span className="size-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <FiDollarSign size={14} />
                </span>
              </div>
              <p className="font-heading font-bold text-xl sm:text-2xl text-indigo-700 mt-2 tabular-nums">
                {formatRupiah(eventStudioNet(selectedEvent))}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">Omzet dikurangi bagi hasil</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="bg-white border border-line rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-base text-ink-900 pb-3 border-b border-line">Tautan &amp; Akses Acara</h3>
          {[
            {
              key: 'guest_tab',
              label: 'Antrean Tamu (QR)',
              hint: 'Dibagikan ke tamu lewat QR di TV atau tablet.',
              url: guestUrl,
              wa: 'Ambil nomor antrean photobooth:',
              actions: [{ key: 'regen', label: 'Buat ulang', icon: <FiRotateCcw size={13} />, onClick: regenerateGuestLink }],
            },
            {
              key: 'crew_tab',
              label: 'Terminal Kru (tanpa login)',
              hint: 'Kru memanggil antrean dan mengatur cetak dari HP. Kirim ke WhatsApp kru booth.',
              url: crewUrlLink,
              wa: 'Terminal kru antrean:',
              actions: [
                { key: 'regen', label: 'Buat ulang', icon: <FiRotateCcw size={13} />, onClick: regenerateCrewLink },
                { key: 'off', label: 'Nonaktifkan', icon: <FiSlash size={13} />, onClick: disableCrewLink, danger: true },
              ],
              emptyAction: { label: 'Aktifkan Link Kru', onClick: enableCrewLink },
            },
            {
              key: 'live_tab',
              label: 'Live Album Publik',
              hint: 'Untuk mitra/pelanggan memantau sesi.',
              url: liveCustomerUrl,
              wa: 'Pantau sesi foto live:',
              actions: [],
            },
          ].map((row) => (
            <div key={row.key} className="p-4 bg-bg border border-line rounded-xl space-y-2">
              <span className="text-xs font-semibold text-ink-700">{row.label}</span>
              <p className="text-xs text-ink-500">{row.hint}</p>
              {row.url ? (
                <>
                  <p className="tabular-nums text-xs text-ink-700 truncate">{row.url}</p>
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => handleCopy(row.url, row.key)}
                      className="shrink-0 min-h-11 px-3.5 bg-white border border-line text-xs font-semibold text-ink-700 rounded-xl hover:bg-yellow-50 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FiCopy size={13} />
                      <span>Salin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => shareWhatsApp(row.wa, row.url)}
                      className="shrink-0 min-h-11 px-3.5 bg-white border border-line text-xs font-semibold text-ink-700 rounded-xl hover:bg-yellow-50 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <SiWhatsapp size={13} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternal(row.url)}
                      className="shrink-0 min-h-11 px-3.5 bg-yellow-500 text-xs font-bold text-ink-900 rounded-xl hover:bg-yellow-400 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FiExternalLink size={13} />
                      <span>Buka</span>
                    </button>
                    {row.actions.map((act) => (
                      <button
                        key={act.key}
                        type="button"
                        onClick={act.onClick}
                        className={`shrink-0 min-h-11 px-3.5 border text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                          act.danger
                            ? 'bg-white border-red-200 text-red-700 hover:bg-red-50'
                            : 'bg-white border-line text-ink-700 hover:bg-yellow-50'
                        }`}
                      >
                        {act.icon}
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                row.emptyAction && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-amber-800 mb-2">Link kru sedang nonaktif.</p>
                    <button
                      type="button"
                      onClick={row.emptyAction.onClick}
                      className="min-h-11 px-4 bg-yellow-500 text-xs font-bold text-ink-900 rounded-xl hover:bg-yellow-400 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FiPlus size={14} />
                      <span>{row.emptyAction.label}</span>
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

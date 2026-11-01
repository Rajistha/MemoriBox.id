'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiTrash2,
  FiBox,
  FiCalendar,
  FiTarget,
  FiCheck,
  FiLock,
  FiUnlock,
  FiSearch,
  FiDownload,
  FiEdit2,
  FiDollarSign,
  FiArrowLeft,
  FiCreditCard,
  FiPercent,
  FiFileText,
  FiX,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRupiah, formatNumberWithDots } from '@/lib/utils';
import {
  eventTotal,
  eventSharing,
  eventStudioNet,
  isPercentMode,
  voucherCount,
} from '@/lib/photoSession';

export default function AdminFinance({ activeSubTab = 'events', onSubTabChange }) {
  const [internalTab, setInternalTab] = useState('events');
  const currentTab = activeSubTab || internalTab;

  const switchTab = (tab) => {
    setInternalTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState('custom'); // 'schedule' | 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventSortOrder, setEventSortOrder] = useState('newest');
  const [recapSortOrder, setRecapSortOrder] = useState('newest');
  const [operationalSearchQuery, setOperationalSearchQuery] = useState('');
  const [operationalSortOrder, setOperationalSortOrder] = useState('dateDesc');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });
  const [masterPage, setMasterPage] = useState(1);

  // Target State
  const [targetAllTime, setTargetAllTime] = useState('150.000.000');
  const [targetKeuntungan, setTargetKeuntungan] = useState('25.000.000');
  const [targetMonth, setTargetMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customTargets, setCustomTargets] = useState([
    { id: '1', name: 'Upgrade Printer DNP RX1-HS', amount: '18.500.000' },
    { id: '2', name: 'Backdrop Arch & LED Neon Box', amount: '6.000.000' },
  ]);
  const [allTargets, setAllTargets] = useState({});
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [newCustomTarget, setNewCustomTarget] = useState({ name: '', amount: '' });
  const [isEditingAllTime, setIsEditingAllTime] = useState(false);
  const [isEditingMonthly, setIsEditingMonthly] = useState(false);

  // Forms State
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', date: format(new Date(), 'yyyy-MM-dd'), income: '' });
  const [newTransaction, setNewTransaction] = useState({ type: 'event_expense', description: '', amount: '', event_id: '' });
  const [newOperationalExpense, setNewOperationalExpense] = useState({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [operationalExpenses, setOperationalExpenses] = useState([]);
  const [isAddOpModalOpen, setIsAddOpModalOpen] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      let eventsData = [];
      let trxData = [];
      let schedData = [];
      let settingsData = [];

      try {
        const [eRes, tRes, sRes, schRes] = await Promise.all([
          supabase.from('financial_events').select('*').order('date', { ascending: false }),
          supabase.from('transactions').select('*').order('date', { ascending: false }),
          supabase.from('settings').select('*'),
          supabase.from('booked_dates').select('*').order('date', { ascending: true }),
        ]);

        if (eRes.data && eRes.data.length > 0) eventsData = eRes.data;
        if (tRes.data) trxData = tRes.data;
        if (sRes.data) settingsData = sRes.data;
        if (schRes.data) schedData = schRes.data;
      } catch (err) {
        console.warn('Finance DB fallback:', err);
      }

      setEvents(eventsData);
      setTransactions(trxData);
      setSchedules(schedData || []);

      if (settingsData && settingsData.length > 0) {
        const targets = {};
        settingsData.forEach((t) => (targets[t.key] = t.value));
        setAllTargets(targets);

        if (targets['target_all_time']) {
          setTargetAllTime(formatNumberWithDots(targets['target_all_time']));
        }

        const currentKey = `target_keuntungan_${format(new Date(), 'yyyy-MM')}`;
        if (targets[currentKey]) {
          setTargetKeuntungan(formatNumberWithDots(targets[currentKey]));
        } else if (targets['target_keuntungan']) {
          setTargetKeuntungan(formatNumberWithDots(targets['target_keuntungan']));
        }

        if (targets['custom_targets']) {
          try {
            setCustomTargets(JSON.parse(targets['custom_targets']));
          } catch (e) {
            console.error('Gagal parsing custom_targets:', e);
          }
        }

        if (targets['operational_expenses']) {
          try {
            setOperationalExpenses(JSON.parse(targets['operational_expenses']));
          } catch (e) {
            console.error('Gagal parsing operational_expenses:', e);
          }
        }
      }
    } catch (error) {
      console.error('Finance error:', error);
      toast.error('Gagal mengambil data keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await fetchData(false);
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const formatIDR = (num) => {
    return formatRupiah(num);
  };

  const getRawNumber = (val) => {
    return parseFloat(String(val || '').replace(/\D/g, '')) || 0;
  };

  const handleNumberInput = (val, setter) => {
    const rawValue = String(val || '').replace(/\D/g, '');
    if (!rawValue) {
      setter('');
      return;
    }
    setter(formatNumberWithDots(rawValue));
  };

  // Helper kalkulasi terpadu: menghubungkan Sesi Foto & Sharing Profit ke Keuangan Event
  const getEventFinancials = (ev) => {
    const hasSessions = Array.isArray(ev?.sessions) && ev.sessions.length > 0;
    const grossIncome = hasSessions ? eventTotal(ev) : (Number(ev?.income) || 0);
    const sharingProfit = hasSessions ? eventSharing(ev) : 0;
    const evTrxExpenses = transactions
      .filter((t) => t.event_id === ev?.id && t.type === 'event_expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpense = evTrxExpenses + sharingProfit;
    const netStudio = grossIncome - totalExpense;

    return {
      hasSessions,
      sessionsCount: hasSessions ? ev.sessions.length : 0,
      grossIncome,
      sharingProfit,
      evTrxExpenses,
      totalExpense,
      netStudio,
      isPercent: isPercentMode(ev),
    };
  };

  // Target Updates
  const handleUpdateAllTime = async (e) => {
    e.preventDefault();
    setIsUpdatingTarget(true);
    try {
      const val = getRawNumber(targetAllTime);
      await supabase.from('settings').upsert({ key: 'target_all_time', value: val }, { onConflict: 'key' });
      setAllTargets((prev) => ({ ...prev, target_all_time: val }));
      setIsEditingAllTime(false);
      toast.success('Target bisnis keseluruhan tersimpan');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan target');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleUpdateMonthly = async (e) => {
    e.preventDefault();
    setIsUpdatingTarget(true);
    try {
      const val = getRawNumber(targetKeuntungan);
      const key = `target_keuntungan_${targetMonth}`;
      await supabase.from('settings').upsert({ key, value: val }, { onConflict: 'key' });
      setAllTargets((prev) => ({ ...prev, [key]: val }));
      setIsEditingMonthly(false);
      toast.success(`Target bulan ${targetMonth} tersimpan`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan target bulanan');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleAddCustomTarget = async (e) => {
    e.preventDefault();
    if (!newCustomTarget.name || !newCustomTarget.amount) return;
    try {
      const updated = [
        ...customTargets,
        { id: Date.now().toString(), name: newCustomTarget.name, amount: newCustomTarget.amount },
      ];
      await supabase
        .from('settings')
        .upsert({ key: 'custom_targets', value: JSON.stringify(updated) }, { onConflict: 'key' });
      setCustomTargets(updated);
      setNewCustomTarget({ name: '', amount: '' });
      toast.success('Target kustom berhasil ditambahkan');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambah target kustom');
    }
  };

  const handleDeleteCustomTarget = async (id) => {
    try {
      const updated = customTargets.filter((t) => t.id !== id);
      await supabase
        .from('settings')
        .upsert({ key: 'custom_targets', value: JSON.stringify(updated) }, { onConflict: 'key' });
      setCustomTargets(updated);
      toast.success('Target kustom dihapus');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus target');
    }
  };

  // Operational Expenses
  const handleAddOperationalExpense = async (e) => {
    e.preventDefault();
    try {
      const newItem = {
        id: Date.now().toString(),
        date: newOperationalExpense.date || format(new Date(), 'yyyy-MM-dd'),
        description: newOperationalExpense.description,
        amount: getRawNumber(newOperationalExpense.amount),
      };
      const updatedList = [newItem, ...operationalExpenses];
      try {
        await supabase
          .from('settings')
          .upsert({ key: 'operational_expenses', value: JSON.stringify(updatedList) }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Sync operational error:', err);
      }
      setOperationalExpenses(updatedList);
      setNewOperationalExpense({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd') });
      setIsAddOpModalOpen(false);
      toast.success('Pengeluaran operasional ditambahkan');
    } catch (error) {
      toast.error('Gagal menambah pengeluaran operasional');
    }
  };

  const handleDeleteOperationalExpense = async (id) => {
    try {
      const updatedList = operationalExpenses.filter((item) => item.id !== id);
      try {
        await supabase
          .from('settings')
          .upsert({ key: 'operational_expenses', value: JSON.stringify(updatedList) }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Delete op error:', err);
      }
      setOperationalExpenses(updatedList);
      toast.success('Pengeluaran operasional dihapus');
    } catch (error) {
      toast.error('Gagal menghapus');
    }
  };

  // Events & Transactions
  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newEvent.name,
        date: newEvent.date,
        income: getRawNumber(newEvent.income),
        is_locked: false,
      };

      let newId = Date.now();
      try {
        const { data, error } = await supabase.from('financial_events').insert([payload]).select();
        if (error) throw error;
        if (data && data[0]) newId = data[0].id;
      } catch (err) {
        console.warn('Add event fallback:', err);
      }

      const created = { id: newId, ...payload, created_at: new Date().toISOString() };
      setEvents((prev) => [created, ...prev]);
      setNewEvent({ name: '', date: format(new Date(), 'yyyy-MM-dd'), income: '' });
      setIsAddEventModalOpen(false);
      toast.success('Event berhasil ditambahkan!');
    } catch (error) {
      toast.error('Gagal menambahkan event');
    }
  };

  const handleToggleLock = async (id, currentStatus) => {
    try {
      try {
        await supabase.from('financial_events').update({ is_locked: !currentStatus }).eq('id', id);
      } catch (err) {
        console.warn('Lock err:', err);
      }
      setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, is_locked: !currentStatus } : ev)));
      toast.success(!currentStatus ? 'Event disimpan & dikunci' : 'Mode Edit aktif');
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleUpdateIncome = async (eventId) => {
    try {
      const newIncome = getRawNumber(incomeDraft);
      try {
        await supabase.from('financial_events').update({ income: newIncome }).eq('id', eventId);
      } catch (err) {
        console.warn('Update income err:', err);
      }
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? { ...ev, income: newIncome } : ev)));
      setIsEditingIncome(false);
      toast.success('Pemasukan event diperbarui!');
    } catch (error) {
      toast.error('Gagal memperbarui pemasukan');
    }
  };

  const handleAddTransaction = async (e, eventId) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount) return;
    try {
      const payload = {
        id: Date.now(),
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'event_expense',
        description: newTransaction.description,
        amount: getRawNumber(newTransaction.amount),
        event_id: eventId,
      };

      try {
        await supabase.from('transactions').insert([payload]);
      } catch (err) {
        console.warn('Add trx err:', err);
      }

      setTransactions((prev) => [payload, ...prev]);
      setNewTransaction({ type: 'event_expense', description: '', amount: '', event_id: '' });
      toast.success('Pengeluaran ditambahkan!');
    } catch (error) {
      toast.error('Gagal menambah pengeluaran');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      try {
        await supabase.from('transactions').delete().eq('id', id);
      } catch (err) {
        console.warn('Delete trx err:', err);
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success('Pengeluaran dihapus');
    } catch (error) {
      toast.error('Gagal menghapus');
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      try {
        await supabase.from('financial_events').delete().eq('id', id);
        await supabase.from('transactions').delete().eq('event_id', id);
      } catch (err) {
        console.warn('Delete event err:', err);
      }
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      setTransactions((prev) => prev.filter((t) => t.event_id !== id));
      if (selectedEventId === id) setSelectedEventId(null);
      toast.success('Event berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus event');
    }
  };

  // PDF Download
  const downloadRecapPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(28, 23, 0);
      doc.text('MEMORIBOX PHOTOBOOTH & PHOTOBOX', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120, 110, 80);
      doc.text(`Laporan Rekapitulasi Keuangan • Dicetak pada ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, 14, 25);

      const tableColumn = ['Nama Event', 'Tanggal', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Laba Bersih (Rp)'];
      const tableRows = [];

      let totalIn = 0;
      let totalOut = 0;

      events.forEach((ev) => {
        const fin = getEventFinancials(ev);
        totalIn += fin.grossIncome;
        totalOut += fin.totalExpense;

        tableRows.push([
          ev.name || '-',
          ev.date || '-',
          formatIDR(fin.grossIncome),
          formatIDR(fin.totalExpense),
          formatIDR(fin.netStudio),
        ]);
      });

      const totalOp = operationalExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      tableRows.push(['SUBTOTAL EVENT', '', formatIDR(totalIn), formatIDR(totalOut), formatIDR(totalIn - totalOut)]);
      tableRows.push(['PENGELUARAN OPERASIONAL', '', '', formatIDR(totalOp), '']);
      tableRows.push(['LABA BERSIH TOTAL', '', '', '', formatIDR(totalIn - totalOut - totalOp)]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        theme: 'grid',
        headStyles: { fillColor: [255, 196, 0], textColor: [28, 23, 0], fontStyle: 'bold' },
        styles: { fontSize: 8.5 },
      });

      doc.save(`Memoribox_Rekapitulasi_Keuangan_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('PDF Rekapitulasi berhasil diunduh!');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengunduh PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- RENDER SUB-TAB: EVENTS ---
  const renderEventsTab = () => {
    if (selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId);
      if (!event) {
        setSelectedEventId(null);
        return null;
      }

      const fin = getEventFinancials(event);
      const eventExpenses = transactions.filter((t) => t.event_id === event.id && t.type === 'event_expense');

      return (
        <div className="space-y-6 max-w-6xl">
          <button
            type="button"
            onClick={() => {
              setSelectedEventId(null);
              setIsEditingIncome(false);
            }}
            className="flex items-center gap-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)] transition-colors text-xs sm:text-sm font-bold cursor-pointer"
          >
            <FiArrowLeft /> Kembali ke Daftar Event
          </button>

          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl overflow-hidden shadow-[var(--admin-shadow)]">
            {/* Header Event */}
            <div className="bg-[var(--admin-hover-bg)] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--admin-border)]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h4 className="text-[var(--admin-accent)] font-bold text-lg sm:text-xl font-heading">{event.name}</h4>
                  {fin.hasSessions && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 border border-amber-500/30 tabular-nums">
                      {fin.sessionsCount} Sesi Terdata
                    </span>
                  )}
                </div>
                <p className="text-[var(--admin-text-muted)] text-xs sm:text-sm mt-0.5">
                  {format(parseISO(event.date), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs sm:text-sm font-bold">
                <div className="bg-[var(--admin-surface)] border border-emerald-500/30 text-emerald-700 px-3.5 py-2 rounded-xl flex items-center justify-between min-w-[150px]">
                  <span className="text-[var(--admin-text-muted)] text-xs font-medium mr-2">Pemasukan:</span>
                  <span className="tabular-nums">{formatIDR(fin.grossIncome)}</span>
                </div>
                <div className="bg-[var(--admin-surface)] border border-yellow-500/30 text-yellow-800 px-3.5 py-2 rounded-xl flex items-center justify-between min-w-[150px]">
                  <span className="text-[var(--admin-text-muted)] text-xs font-medium mr-2">Pengeluaran:</span>
                  <span className="tabular-nums">{formatIDR(fin.totalExpense)}</span>
                </div>
                <div className="bg-yellow-500 text-ink-900 px-4 py-2 rounded-xl flex items-center justify-between min-w-[160px] font-bold shadow-sm">
                  <span className="text-xs font-semibold mr-2 opacity-90">Laba Bersih:</span>
                  <span className="tabular-nums">{formatIDR(fin.netStudio)}</span>
                </div>
              </div>
            </div>

            {/* Event Body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Income editor */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      {fin.hasSessions ? 'Pemasukan Sesi (Otomatis)' : 'Nilai Pemasukan Acara'}
                    </span>
                    {!event.is_locked && !fin.hasSessions && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingIncome(!isEditingIncome);
                          setIncomeDraft(formatNumberWithDots(event.income || 0));
                        }}
                        className="text-xs text-[var(--admin-accent)] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FiEdit2 /> {isEditingIncome ? 'Batal' : 'Edit'}
                      </button>
                    )}
                  </div>

                  {isEditingIncome && !fin.hasSessions ? (
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--admin-text-muted)]">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={incomeDraft}
                          onChange={(e) => handleNumberInput(e.target.value, setIncomeDraft)}
                          className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--admin-text-main)] font-bold focus:outline-none focus:border-yellow-500 tabular-nums"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateIncome(event.id)}
                        className="px-4 py-2 rounded-lg bg-yellow-500 text-ink-900 font-bold text-xs hover:bg-yellow-400 transition cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 font-heading tabular-nums">
                        {formatIDR(fin.grossIncome)}
                      </div>
                      {fin.hasSessions && (
                        <p className="text-xs text-[var(--admin-text-muted)] mt-1 tabular-nums">
                          Dihitung otomatis dari total {fin.sessionsCount} sesi foto terdata
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {fin.hasSessions && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-1.5">
                    <div className="font-bold text-amber-700 flex items-center gap-1.5">
                      <FiPercent /> Bagi Hasil Mitra (Sharing Profit)
                    </div>
                    <p className="text-[var(--admin-text-muted)]">
                      Bagi hasil diambil langsung dari pencatatan sesi foto:{' '}
                      <span className="font-bold tabular-nums text-amber-700">
                        {formatIDR(fin.sharingProfit)}
                      </span>{' '}
                      ({fin.isPercent ? `${event.share_percent || 20}% dari omzet sesi` : `@${formatIDR(event.share_per_voucher || 10000)}/vcr`}).
                    </p>
                  </div>
                )}

                <div className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl p-4 text-xs text-[var(--admin-text-muted)] space-y-2">
                  <div className="font-bold text-[var(--admin-text-main)] flex items-center gap-1.5">
                    <FiLock /> Status Proteksi Data
                  </div>
                  <p>
                    {event.is_locked
                      ? 'Event dalam status terkunci. Data pengeluaran dan pemasukan tidak dapat diubah tanpa membuka proteksi.'
                      : 'Event dalam status terbuka (aktif). Anda dapat menambah atau menghapus pos pengeluaran.'}
                  </p>
                </div>
              </div>

              {/* Right Column: Transactions per Event */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-[var(--admin-text-main)] font-heading">
                    Daftar Pengeluaran Event ({eventExpenses.length + (fin.sharingProfit > 0 ? 1 : 0)})
                  </h5>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {/* Automatic Sharing Profit item */}
                  {fin.sharingProfit > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-xs text-[var(--admin-text-main)] truncate flex items-center gap-1.5">
                          <FiPercent className="text-amber-700" />
                          <span>Bagi Hasil Mitra (Otomatis dari Sesi)</span>
                        </p>
                        <p className="text-xs text-[var(--admin-text-muted)] tabular-nums">
                          {fin.isPercent ? `${event.share_percent || 20}% Omzet` : `@${formatIDR(event.share_per_voucher || 10000)} per voucher`}
                        </p>
                      </div>
                      <span className="font-bold text-xs text-amber-700 tabular-nums">
                        {formatIDR(fin.sharingProfit)}
                      </span>
                    </div>
                  )}

                  {eventExpenses.length === 0 && fin.sharingProfit === 0 ? (
                    <p className="text-xs text-[var(--admin-text-muted)] py-6 text-center bg-[var(--admin-input-bg)] rounded-xl border border-[var(--admin-border-subtle)]">
                      Belum ada pos pengeluaran untuk event ini.
                    </p>
                  ) : (
                    eventExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-3 bg-[var(--admin-input-bg)] border border-[var(--admin-border-subtle)] rounded-xl flex items-center justify-between hover:border-[var(--admin-border)] transition"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-semibold text-xs text-[var(--admin-text-main)] truncate">
                            {exp.description}
                          </p>
                          <p className="text-xs text-[var(--admin-text-muted)]">{exp.date || event.date}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-xs text-yellow-800 font-heading">
                            {formatIDR(exp.amount)}
                          </span>
                          {!event.is_locked && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(exp.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                              title="Hapus"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!event.is_locked && (
                  <form
                    onSubmit={(e) => handleAddTransaction(e, event.id)}
                    className="p-3.5 bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] rounded-xl flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Deskripsi pengeluaran..."
                      required
                      value={newTransaction.description}
                      onChange={(e) =>
                        setNewTransaction((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="flex-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Rp Nominal"
                        required
                        value={newTransaction.amount}
                        onChange={(e) =>
                          handleNumberInput(e.target.value, (val) =>
                            setNewTransaction((prev) => ({ ...prev, amount: val }))
                          )
                        }
                        className="w-32 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 font-semibold"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-yellow-500 text-ink-900 rounded-lg font-bold text-xs hover:bg-yellow-400 transition shrink-0 flex items-center gap-1"
                      >
                        <FiPlus /> Tambah
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] flex justify-end">
              <button
                type="button"
                onClick={() => handleToggleLock(event.id, event.is_locked)}
                className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs transition ${
                  event.is_locked
                    ? 'bg-yellow-500/15 text-[var(--admin-accent)] border border-yellow-500/30 hover:bg-yellow-500/25'
                    : 'bg-yellow-500 text-ink-900 hover:bg-yellow-400'
                }`}
              >
                {event.is_locked ? <FiLock /> : <FiUnlock />}
                {event.is_locked ? 'Buka Kunci (Edit)' : 'Kunci & Simpan Event'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // List View
    const filteredEvents = events.filter((ev) =>
      (ev.name || '').toLowerCase().includes(eventSearchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 max-w-6xl">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              placeholder="Cari event photobooth..."
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadRecapPDF}
              className="px-4 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text-main)] text-xs font-bold flex items-center gap-1.5 transition"
            >
              <FiDownload /> Rekap PDF
            </button>
            <button
              type="button"
              onClick={() => setIsAddEventModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <FiPlus /> Event Baru
            </button>
          </div>
        </div>

        {/* Events Table / Card List */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl overflow-hidden shadow-[var(--admin-shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--admin-hover-bg)] text-[var(--admin-text-muted)] uppercase text-xs font-bold tracking-wider border-b border-[var(--admin-border)]">
                <tr>
                  <th className="py-3.5 px-5">Nama Event</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4 text-right">Pemasukan</th>
                  <th className="py-3.5 px-4 text-right">Pengeluaran</th>
                  <th className="py-3.5 px-4 text-right">Laba Bersih</th>
                  <th className="py-3.5 px-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border-subtle)] text-[var(--admin-text-main)]">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[var(--admin-text-muted)]">
                      Tidak ada event ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => {
                    const fin = getEventFinancials(ev);

                    return (
                      <tr
                        key={ev.id}
                        className="hover:bg-[var(--admin-hover-bg)] transition cursor-pointer"
                        onClick={() => setSelectedEventId(ev.id)}
                      >
                        <td className="py-3.5 px-5 font-bold flex items-center gap-2">
                          {ev.is_locked ? (
                            <FiLock className="text-zinc-400 shrink-0" size={13} title="Terkunci" />
                          ) : (
                            <FiUnlock className="text-yellow-800 shrink-0" size={13} title="Terbuka" />
                          )}
                          <span className="truncate max-w-[200px]">{ev.name}</span>
                          {fin.hasSessions && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 tabular-nums">
                              {fin.sessionsCount} sesi
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--admin-text-muted)] whitespace-nowrap">
                          {ev.date || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                          {formatIDR(fin.grossIncome)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-yellow-800 whitespace-nowrap tabular-nums">
                          {formatIDR(fin.totalExpense)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[var(--admin-accent)] whitespace-nowrap tabular-nums">
                          {formatIDR(fin.netStudio)}
                        </td>
                        <td className="py-3.5 px-5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedEventId(ev.id)}
                              className="px-3 py-1 bg-[var(--admin-hover-bg)] hover:bg-yellow-500 hover:text-ink-900 rounded-lg text-xs font-bold transition"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                              title="Hapus Event"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Event Modal */}
        {isAddEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
                <h3 className="font-bold text-base text-[var(--admin-accent)] font-heading">Tambah Event Baru</h3>
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[var(--admin-text-muted)] uppercase mb-1">Nama Event</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Wedding Putri & Dimas"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--admin-text-muted)] uppercase mb-1">Tanggal Acara</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--admin-text-muted)] uppercase mb-1">Pemasukan Awal (Rp)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 5.000.000"
                    value={newEvent.income}
                    onChange={(e) => handleNumberInput(e.target.value, (val) => setNewEvent({ ...newEvent, income: val }))}
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 font-bold"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddEventModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--admin-border)] font-bold text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover-bg)] transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold shadow-sm transition"
                  >
                    Simpan Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER SUB-TAB: OPERATIONAL ---
  const renderOperationalTab = () => {
    const filteredOps = operationalExpenses.filter((op) =>
      (op.description || '').toLowerCase().includes(operationalSearchQuery.toLowerCase())
    );
    const totalOp = filteredOps.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              placeholder="Cari pengeluaran operasional..."
              value={operationalSearchQuery}
              onChange={(e) => setOperationalSearchQuery(e.target.value)}
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
          >
            <FiPlus /> Tambah Pengeluaran
          </button>
        </div>

        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-6 shadow-[var(--admin-shadow)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wider">
              Total Pengeluaran Operasional
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-700 font-heading mt-1">
              {formatIDR(totalOp)}
            </h3>
          </div>
          <span className="text-xs text-[var(--admin-text-muted)] font-medium">
            {filteredOps.length} Transaksi Terdata
          </span>
        </div>

        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl overflow-hidden shadow-[var(--admin-shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--admin-hover-bg)] text-[var(--admin-text-muted)] uppercase text-xs font-bold tracking-wider border-b border-[var(--admin-border)]">
                <tr>
                  <th className="py-3.5 px-5">Tanggal</th>
                  <th className="py-3.5 px-4">Deskripsi Kebutuhan</th>
                  <th className="py-3.5 px-4 text-right">Nominal Pengeluaran</th>
                  <th className="py-3.5 px-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border-subtle)] text-[var(--admin-text-main)]">
                {filteredOps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-[var(--admin-text-muted)]">
                      Belum ada pos pengeluaran operasional.
                    </td>
                  </tr>
                ) : (
                  filteredOps.map((op) => (
                    <tr key={op.id} className="hover:bg-[var(--admin-hover-bg)] transition">
                      <td className="py-3.5 px-5 text-[var(--admin-text-muted)] whitespace-nowrap">{op.date}</td>
                      <td className="py-3.5 px-4 font-semibold">{op.description}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-700 whitespace-nowrap">
                        {formatIDR(op.amount)}
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteOperationalExpense(op.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Hapus"
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

        {/* Add Modal */}
        {isAddOpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
                <h3 className="font-bold text-base text-[var(--admin-accent)] font-heading">
                  Tambah Pengeluaran Operasional
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddOpModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleAddOperationalExpense} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[var(--admin-text-muted)] uppercase mb-1">
                    Deskripsi Kebutuhan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Internet, Listrik, Transport"
                    value={newOperationalExpense.description}
                    onChange={(e) =>
                      setNewOperationalExpense({ ...newOperationalExpense, description: e.target.value })
                    }
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--admin-text-muted)] uppercase mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={newOperationalExpense.date}
                    onChange={(e) =>
                      setNewOperationalExpense({ ...newOperationalExpense, date: e.target.value })
                    }
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--admin-text-muted)] uppercase mb-1">
                    Nominal Biaya (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1.500.000"
                    value={newOperationalExpense.amount}
                    onChange={(e) =>
                      handleNumberInput(e.target.value, (val) =>
                        setNewOperationalExpense({ ...newOperationalExpense, amount: val })
                      )
                    }
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 font-bold"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--admin-border)] font-bold text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover-bg)] transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold shadow-sm transition"
                  >
                    Simpan Pengeluaran
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER SUB-TAB: RECAP ---
  const renderRecapTab = () => {
    let filteredEvents = events.filter((ev) =>
      (ev.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalIn = filteredEvents.reduce((sum, ev) => sum + getEventFinancials(ev).grossIncome, 0);
    const totalOut = filteredEvents.reduce((sum, ev) => sum + getEventFinancials(ev).totalExpense, 0);
    const totalOp = operationalExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const netTotal = totalIn - totalOut - totalOp;

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              placeholder="Cari event rekap..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={downloadRecapPDF}
            className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
          >
            <FiDownload /> Unduh Laporan PDF
          </button>
        </div>

        {/* Summary 4-card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-5 shadow-[var(--admin-shadow)]">
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">
              Total Omzet Event
            </p>
            <h4 className="text-xl font-bold text-emerald-700 font-heading tabular-nums">{formatIDR(totalIn)}</h4>
          </div>

          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-5 shadow-[var(--admin-shadow)]">
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">
              Pengeluaran Event & Sharing
            </p>
            <h4 className="text-xl font-bold text-yellow-800 font-heading tabular-nums">{formatIDR(totalOut)}</h4>
          </div>

          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-5 shadow-[var(--admin-shadow)]">
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">
              Pengeluaran Operasional
            </p>
            <h4 className="text-xl font-bold text-amber-700 font-heading tabular-nums">{formatIDR(totalOp)}</h4>
          </div>

          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl p-5 shadow-[var(--admin-shadow)]">
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">
              Laba Bersih Akhir
            </p>
            <h4 className="text-xl font-bold text-[var(--admin-accent)] font-heading tabular-nums">{formatIDR(netTotal)}</h4>
          </div>
        </div>

        {/* Table of Events in Recap */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl overflow-hidden shadow-[var(--admin-shadow)]">
          <div className="p-4 bg-[var(--admin-hover-bg)] border-b border-[var(--admin-border)] font-bold text-xs sm:text-sm text-[var(--admin-text-main)] font-heading">
            Rincian Performa per Event
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--admin-surface)] text-[var(--admin-text-muted)] uppercase text-xs font-bold tracking-wider border-b border-[var(--admin-border)]">
                <tr>
                  <th className="py-3 px-5">Nama Event</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-right">Pemasukan</th>
                  <th className="py-3 px-4 text-right">Biaya & Sharing</th>
                  <th className="py-3 px-5 text-right">Laba Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border-subtle)] text-[var(--admin-text-main)]">
                {filteredEvents.map((ev) => {
                  const fin = getEventFinancials(ev);

                  return (
                    <tr key={ev.id} className="hover:bg-[var(--admin-hover-bg)] transition">
                      <td className="py-3.5 px-5 font-bold truncate max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span>{ev.name}</span>
                          {fin.hasSessions && (
                            <span className="text-xs tabular-nums px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700">
                              {fin.sessionsCount} sesi
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--admin-text-muted)]">{ev.date}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 tabular-nums">{formatIDR(fin.grossIncome)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-yellow-800 tabular-nums">{formatIDR(fin.totalExpense)}</td>
                      <td className="py-3.5 px-5 text-right font-bold text-[var(--admin-accent)] tabular-nums">{formatIDR(fin.netStudio)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER SUB-TAB: TARGET ---
  const renderTargetTab = () => {
    return (
      <div className="space-y-6 max-w-6xl">
        {/* All-Time Target */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] p-6 rounded-2xl shadow-[var(--admin-shadow)]">
          <h3 className="text-[var(--admin-accent)] font-bold mb-4 flex items-center gap-2 text-sm sm:text-base font-heading">
            <FiTarget /> Target Keuntungan Keseluruhan Bisnis
          </h3>
          {isEditingAllTime ? (
            <form onSubmit={handleUpdateAllTime} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] font-bold text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  value={targetAllTime}
                  onChange={(e) => handleNumberInput(e.target.value, setTargetAllTime)}
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--admin-text-main)] font-bold focus:outline-none focus:border-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={isUpdatingTarget}
                className="bg-yellow-500 hover:bg-yellow-400 text-ink-900 rounded-xl px-5 py-2.5 font-bold text-xs transition flex items-center justify-center shrink-0"
              >
                {isUpdatingTarget ? 'Menyimpan...' : 'Simpan Target'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1 max-w-sm bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-[var(--admin-text-main)] font-bold text-base font-heading">
                Rp {targetAllTime}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAllTime(true)}
                className="bg-[var(--admin-input-bg)] hover:bg-yellow-500 hover:text-ink-900 text-[var(--admin-text-main)] border border-[var(--admin-border)] rounded-xl p-3 transition flex items-center justify-center shrink-0"
                title="Edit Target"
              >
                <FiEdit2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Monthly Target */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] p-6 rounded-2xl shadow-[var(--admin-shadow)]">
          <h3 className="text-[var(--admin-accent)] font-bold mb-4 flex items-center gap-2 text-sm sm:text-base font-heading">
            <FiCalendar /> Target Keuntungan Bulanan
          </h3>
          {isEditingMonthly ? (
            <form onSubmit={handleUpdateMonthly} className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="month"
                required
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 [color-scheme:dark]"
              />
              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] font-bold text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  value={targetKeuntungan}
                  onChange={(e) => handleNumberInput(e.target.value, setTargetKeuntungan)}
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--admin-text-main)] font-bold focus:outline-none focus:border-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={isUpdatingTarget}
                className="bg-yellow-500 hover:bg-yellow-400 text-ink-900 rounded-xl px-5 py-2.5 font-bold text-xs transition flex items-center justify-center shrink-0"
              >
                {isUpdatingTarget ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-4">
              <div className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--admin-text-muted)]">
                Bulan: {targetMonth}
              </div>
              <div className="flex-1 max-w-sm bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-[var(--admin-text-main)] font-bold text-base font-heading">
                Rp {targetKeuntungan}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingMonthly(true)}
                className="bg-[var(--admin-input-bg)] hover:bg-yellow-500 hover:text-ink-900 text-[var(--admin-text-main)] border border-[var(--admin-border)] rounded-xl p-3 transition flex items-center justify-center shrink-0"
                title="Edit Target Bulanan"
              >
                <FiEdit2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Custom Targets List */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] p-6 rounded-2xl shadow-[var(--admin-shadow)]">
          <h3 className="text-[var(--admin-accent)] font-bold mb-4 flex items-center gap-2 text-sm sm:text-base font-heading">
            <FiBox /> Target Kustom (Peralatan & Milestone)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {customTargets.map((ct) => (
              <div
                key={ct.id}
                className="p-4 bg-[var(--admin-input-bg)] border border-[var(--admin-border-subtle)] rounded-xl flex items-center justify-between"
              >
                <div>
                  <h5 className="font-bold text-xs sm:text-sm text-[var(--admin-text-main)]">{ct.name}</h5>
                  <p className="font-bold text-yellow-800 text-sm mt-0.5 font-heading">Rp {ct.amount}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomTarget(ct.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                  title="Hapus"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCustomTarget} className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              required
              placeholder="Nama target (misal: Beli Kamera Sony A7 IV)..."
              value={newCustomTarget.name}
              onChange={(e) => setNewCustomTarget({ ...newCustomTarget, name: e.target.value })}
              className="flex-1 bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Nominal Rp"
                value={newCustomTarget.amount}
                onChange={(e) => handleNumberInput(e.target.value, (val) => setNewCustomTarget({ ...newCustomTarget, amount: val }))}
                className="w-36 bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--admin-text-main)] focus:outline-none focus:border-yellow-500 font-bold"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-ink-900 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <FiPlus /> Tambah Target
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const SUB_TABS = [
    { id: 'events', label: 'Pemasukan Event', icon: FiDollarSign },
    { id: 'operational', label: 'Biaya Operasional', icon: FiCreditCard },
    { id: 'recap', label: 'Rekapitulasi Laba', icon: FiPercent },
    { id: 'target', label: 'Target', icon: FiTarget },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-ink-900">
            Kas
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={downloadRecapPDF}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-bg text-ink-700 border border-line shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FiDownload /> Unduh Laporan PDF
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar - Studio Pill Style */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-yellow-400 text-ink-900 shadow-xs'
                  : 'bg-white hover:bg-bg text-ink-700 hover:text-ink-900 border border-line shadow-2xs'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Dynamic Body */}
      <div>
        {currentTab === 'events' && renderEventsTab()}
        {currentTab === 'operational' && renderOperationalTab()}
        {currentTab === 'recap' && renderRecapTab()}
        {currentTab === 'target' && renderTargetTab()}
      </div>
    </div>
  );
}

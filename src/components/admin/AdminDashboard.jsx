'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiTrendingUp,
  FiTarget,
  FiArrowUpRight,
  FiActivity,
  FiPieChart,
  FiCalendar,
  FiStar,
  FiPercent,
  FiList,
  FiDollarSign,
  FiFileText,
  FiImage,
  FiUsers,
  FiCamera,
  FiRefreshCw,
  FiDownload,
  FiCheckCircle,
  FiVolume2,
} from 'react-icons/fi';
import { format, getDaysInMonth, getDate, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatRupiah } from '@/lib/utils';
import { eventTotal, eventSharing, SHARING_SOURCE } from '@/lib/photoSession';
import ErrorState from '@/components/ui/ErrorState';
import { unwrap } from '@/lib/db';
import { Skeleton } from '@/components/ui/Skeleton';
import { SITE_PROFILE_KEY, normalizeProfile } from '@/lib/siteProfile';

export default function AdminDashboard({ onSelectTab }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [missingContacts, setMissingContacts] = useState([]);

  // Pengingat bila kontak di menu Profil belum lengkap (tombol WhatsApp dan bagian Kontak bergantung padanya).
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', SITE_PROFILE_KEY).maybeSingle();
        if (ignore) return;
        const p = normalizeProfile(data?.value);
        const missing = [];
        if (!p.whatsapp) missing.push('WhatsApp');
        if (!p.email) missing.push('email');
        if (!p.instagram) missing.push('Instagram');
        setMissingContacts(missing);
      } catch {
        // pengingat bersifat opsional
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);
  const [stats, setStats] = useState({
    totalEventIncome: 0,
    totalEventExpense: 0,
    totalOperationalExpense: 0,
    netProfit: 0,
  });
  const [insightStats, setInsightStats] = useState({
    totalEvents: 0,
    avgProfit: 0,
    profitMargin: 0,
    topEventName: '-',
    topEventProfit: 0,
    thisMonthNetProfit: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [targets, setTargets] = useState({
    allTime: 0,
    monthly: 0,
    custom: [],
  });
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [pastSchedules, setPastSchedules] = useState([]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    setLoadError(false);
    try {
      // Acara dimuat ringkas (sesi hanya voucher/print): dashboard hanya butuh total, bukan riwayat sesi.
      const [eRes, tRes, sRes, schRes] = await Promise.all([
        supabase.rpc('admin_events_compact'),
        supabase.from('transactions').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('booked_dates').select('*').order('date', { ascending: true }),
      ]);

      const events = [...(unwrap(eRes) || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      // Baris sharing otomatis dibuat database; sharing sudah dihitung dari sesi (calcEventFin), jadi jangan dihitung dua kali.
      const transactions = (unwrap(tRes) || []).filter((t) => t.auto_source !== SHARING_SOURCE);
      const settingsData = unwrap(sRes) || [];
      const schedules = unwrap(schRes) || [];

      const currentMonthStr = format(new Date(), 'yyyy-MM');
      let targetAllTime = 0;
      let targetMonthly = 0;
      let customTargets = [];
      let operationalExpenses = [];

      if (settingsData && settingsData.length > 0) {
        const t = {};
        settingsData.forEach((item) => (t[item.key] = item.value));

        if (t['target_all_time']) targetAllTime = Number(t['target_all_time']);
        if (t[`target_keuntungan_${currentMonthStr}`]) {
          targetMonthly = Number(t[`target_keuntungan_${currentMonthStr}`]);
        } else if (t['target_keuntungan']) {
          targetMonthly = Number(t['target_keuntungan']);
        }

        if (t['custom_targets']) {
          try {
            customTargets = JSON.parse(t['custom_targets']);
          } catch (e) {
            console.error('Gagal parsing custom_targets:', e);
          }
        }

        if (t['operational_expenses']) {
          try {
            operationalExpenses = JSON.parse(t['operational_expenses']);
          } catch (e) {
            console.error('Gagal parsing operational_expenses:', e);
          }
        }
      }

      setTargets({ allTime: targetAllTime, monthly: targetMonthly, custom: customTargets });

      // Schedules
      let unifiedSchedules = [...(schedules || [])];
      events.forEach((ev) => {
        if (ev.date) {
          const exists = unifiedSchedules.some(
            (s) => s.date === ev.date && (s.event_name === ev.name || s.name === ev.name)
          );
          if (!exists) {
            unifiedSchedules.push({ id: `fin_${ev.id}`, date: ev.date, event_name: ev.name });
          }
        }
      });

      if (unifiedSchedules.length > 0) {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const upcoming = unifiedSchedules
          .filter((d) => parseISO(d.date) >= today)
          .sort((a, b) => parseISO(a.date) - parseISO(b.date));
        const past = unifiedSchedules
          .filter((d) => parseISO(d.date) < today)
          .sort((a, b) => parseISO(b.date) - parseISO(a.date));
        setUpcomingSchedules(upcoming);
        setPastSchedules(past);
      }

      let eventExpense = 0;
      let eventIncome = 0;
      let thisMonthNetProfit = 0;

      const calcEventFin = (ev) => {
        const hasSessions = Array.isArray(ev?.sessions) && ev.sessions.length > 0;
        const gross = hasSessions ? eventTotal(ev) : Number(ev?.income || 0);
        const share = hasSessions ? eventSharing(ev) : 0;
        return { gross, share, hasSessions };
      };

      if (events) {
        eventIncome = events.reduce((acc, curr) => acc + calcEventFin(curr).gross, 0);
      }

      if (transactions) {
        transactions.forEach((t) => {
          if (t.type === 'event_expense') eventExpense += Number(t.amount || 0);
        });
      }
      if (events) {
        events.forEach((ev) => {
          eventExpense += calcEventFin(ev).share;
        });
      }

      const totalOperationalExpense = operationalExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      events.forEach((ev) => {
        if (ev.date && ev.date.startsWith(currentMonthStr)) {
          const fin = calcEventFin(ev);
          const evExpenses = transactions
            .filter((t) => t.event_id === ev.id && t.type === 'event_expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
          thisMonthNetProfit += fin.gross - (evExpenses + fin.share);
        }
      });

      const thisMonthOperational = operationalExpenses
        .filter((t) => t.date && t.date.startsWith(currentMonthStr))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      thisMonthNetProfit -= thisMonthOperational;

      const netProfit = eventIncome - eventExpense - totalOperationalExpense;
      const totalEvents = events.length;
      let topEventName = '-';
      let topEventProfit = 0;

      events.forEach((ev) => {
        const fin = calcEventFin(ev);
        const evExpenses = transactions
          .filter((t) => t.event_id === ev.id)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const evProfit = fin.gross - (evExpenses + fin.share);
        if (evProfit >= topEventProfit && evProfit > 0) {
          topEventProfit = evProfit;
          topEventName = ev.name;
        }
      });

      const avgProfit = totalEvents > 0 ? netProfit / totalEvents : 0;
      const profitMargin = eventIncome > 0 ? (netProfit / eventIncome) * 100 : 0;

      setInsightStats({
        totalEvents,
        avgProfit,
        profitMargin,
        topEventName,
        topEventProfit,
        thisMonthNetProfit,
      });

      setStats({
        totalEventIncome: eventIncome,
        totalEventExpense: eventExpense,
        totalOperationalExpense,
        netProfit,
      });

      // Prepare Chart Data (Last 7 events)
      const dataForChart = events
        .map((ev) => {
          const fin = calcEventFin(ev);
          const evExpenses = transactions
            .filter((t) => t.event_id === ev.id && t.type === 'event_expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
          return {
            name: (ev.name || 'Event').substring(0, 12),
            Pemasukan: fin.gross,
            Pengeluaran: evExpenses + fin.share,
          };
        })
        .slice(-7);
      setChartData(dataForChart);

      // Prepare Pie Chart Data
      const expenseMap = {};
      transactions
        .filter((t) => t.type === 'event_expense')
        .forEach((t) => {
          const desc = (t.description || 'Lainnya').toLowerCase().trim();
          const displayDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
          expenseMap[displayDesc] = (expenseMap[displayDesc] || 0) + Number(t.amount || 0);
        });

      let pieArr = Object.keys(expenseMap).map((key) => ({ name: key, value: expenseMap[key] }));
      pieArr.sort((a, b) => b.value - a.value);

      if (pieArr.length > 4) {
        const top4 = pieArr.slice(0, 4);
        const othersValue = pieArr.slice(4).reduce((sum, curr) => sum + curr.value, 0);
        pieArr = [...top4, { name: 'Lainnya', value: othersValue }];
      }
      // Tanpa pengeluaran, grafik dibiarkan kosong (tidak ada data contoh).
      setPieData(pieArr);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await fetchDashboardData(false);
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const formatIDR = (num) => {
    return formatRupiah(num);
  };

  // Warna grafik memakai token desain (globals.css), bukan hex baru.
  const PIE_COLORS = [
    'var(--color-yellow-500)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-ink-300)',
    'var(--color-yellow-700)',
  ];

  const allTimeTarget = targets.allTime || 1;
  const allTimeTercapaiRaw = Math.max(0, ((stats.netProfit || 0) / allTimeTarget) * 100);
  const allTimeTercapaiWidth = Math.min(allTimeTercapaiRaw, 100);

  const monthlyTarget = targets.monthly || 1;
  const monthlyTercapaiRaw = Math.max(0, ((insightStats.thisMonthNetProfit || 0) / monthlyTarget) * 100);
  const monthlyTercapaiWidth = Math.min(monthlyTercapaiRaw, 100);

  if (loadError) {
    return <ErrorState title="Gagal memuat dashboard" onRetry={() => fetchDashboardData(true)} className="max-w-6xl" />;
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl" aria-busy="true">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const netPositive = (stats.netProfit || 0) >= 0;

  const kpis = [
    { label: 'Pemasukan Event', value: formatIDR(stats.totalEventIncome), icon: FiDollarSign },
    {
      label: 'Laba Bersih',
      value: formatIDR(stats.netProfit),
      icon: FiTrendingUp,
      tone: netPositive ? 'text-success' : 'text-danger',
    },
    { label: 'Margin Keuntungan', value: `${insightStats.profitMargin.toFixed(1)}%`, icon: FiPercent },
    { label: 'Event Terdata', value: `${insightStats.totalEvents || 0} acara`, icon: FiCalendar },
  ];

  const shortcuts = [
    { id: 'finance_invoice', label: 'Invoice', icon: FiFileText },
    { id: 'schedule', label: 'Jadwal', icon: FiCalendar },
    { id: 'queue', label: 'Antrean', icon: FiUsers },
    { id: 'sesi', label: 'Sesi Foto', icon: FiCamera },
    { id: 'finance', label: 'Kas', icon: FiDollarSign },
    { id: 'gallery', label: 'Galeri', icon: FiImage },
  ];

  return (
    <div className="space-y-6 font-sans max-w-6xl">
      {/* Header */}
      <div className="bg-white border border-line rounded-2xl p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-ink-900 tracking-tight">Dashboard</h2>
          <p className="text-sm text-ink-500 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            className="h-11 px-4 text-sm font-semibold text-ink-700 bg-white hover:bg-yellow-50 border border-line rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
            aria-label="Segarkan data"
          >
            <FiRefreshCw />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('finance_invoice')}
            className="h-11 px-5 bg-yellow-500 hover:bg-yellow-600 text-ink-900 font-bold text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <FiFileText />
            <span>Buat Invoice</span>
          </button>
        </div>
      </div>

      {missingContacts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 p-4" role="status">
          <p className="text-sm text-ink-900">
            <span className="font-bold">Kontak belum lengkap:</span> {missingContacts.join(', ')}. Tombol WhatsApp dan bagian Kontak di website bergantung pada data ini.
          </p>
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('profil')}
            className="h-11 px-5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-ink-900 font-bold text-sm shrink-0 cursor-pointer"
          >
            Lengkapi di Profil
          </button>
        </div>
      )}

      {/* Ringkasan keuangan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-card min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-ink-500 truncate">{label}</span>
              <span className="size-9 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0">
                <Icon className="text-base" />
              </span>
            </div>
            <p className={`mt-3 font-heading font-bold text-xl sm:text-2xl tracking-tight truncate ${tone || 'text-ink-900'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Pintasan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {shortcuts.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTab && onSelectTab(id)}
            className="group bg-white border border-line rounded-2xl p-4 min-h-16 text-left flex items-center gap-3 shadow-card hover:border-yellow-500 transition-colors cursor-pointer"
          >
            <span className="size-10 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 group-hover:bg-yellow-500 group-hover:text-ink-900 transition-colors">
              <Icon className="text-lg" />
            </span>
            <span className="font-heading font-bold text-sm text-ink-900 truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* 3. Target Omzet & Perkembangan Keuangan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Target & Line Chart (2 Kolom) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Progress Card */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-800">
                  <FiTarget className="text-sm" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-ink-900">
                    Target Pendapatan
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('finance_target')}
                className="text-xs font-bold text-ink-700 bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Atur Target
              </button>
            </div>

            {/* Target Keseluruhan */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-ink-700 mb-2">
                <span>Target Keseluruhan Bisnis</span>
                <span className="tabular-nums text-ink-900 font-bold">{formatIDR(targets.allTime)}</span>
              </div>
              <div className="h-3 w-full bg-yellow-50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                  style={{ width: `${allTimeTercapaiWidth}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-ink-500 font-medium">
                <span>Terkumpul: {formatIDR(stats.netProfit)}</span>
                <span className="text-emerald-600 font-bold">{allTimeTercapaiRaw.toFixed(1)}% Tercapai</span>
              </div>
            </div>

            {/* Target Bulan Ini */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-ink-700 mb-2">
                <span>Target Bulan Ini ({format(new Date(), 'MMMM yyyy')})</span>
                <span className="tabular-nums text-ink-900 font-bold">{formatIDR(targets.monthly)}</span>
              </div>
              <div className="h-3 w-full bg-yellow-50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${monthlyTercapaiWidth}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-ink-500 font-medium">
                <span>Bulan Ini: {formatIDR(insightStats.thisMonthNetProfit)}</span>
                <span className="text-emerald-600 font-bold">{monthlyTercapaiRaw.toFixed(1)}% Tercapai</span>
              </div>
            </div>
          </div>

          {/* Line Chart: Perkembangan Pemasukan vs Pengeluaran */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-card flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-800">
                  <FiActivity className="text-sm" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-ink-900">
                    Perkembangan Keuangan Event
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('finance_recap')}
                className="text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Lihat Rekap
              </button>
            </div>

            <div className="h-[280px] w-full pt-2">
              {chartData.length === 0 ? (
                <p className="h-full flex items-center justify-center rounded-xl border border-dashed border-ink-300 text-sm text-ink-500 text-center px-4">
                  Belum ada data keuangan. Grafik tampil setelah ada acara dan transaksi.
                </p>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--color-ink-500)"
                    fontSize={11}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="var(--color-ink-500)"
                    fontSize={11}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(1)}jt`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-line)',
                      borderRadius: '12px',
                      color: 'var(--color-ink-900)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      fontWeight: '600',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ color: 'var(--color-ink-900)', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}
                    formatter={(value) => formatIDR(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '15px', fontWeight: '600' }} />
                  <Line
                    type="monotone"
                    dataKey="Pemasukan"
                    stroke="var(--color-success)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--color-success)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Pengeluaran"
                    stroke="var(--color-warning)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--color-warning)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Kategori Beban Studio (1 Kolom) */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-line mb-4">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-800">
                <FiPieChart className="text-sm" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-ink-900">
                  Pos Beban
                </h3>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center relative min-h-[220px]">
              {pieData.length === 0 ? (
                <p className="w-full min-h-[200px] flex items-center justify-center rounded-xl border border-dashed border-ink-300 text-sm text-ink-500 text-center px-4">
                  Belum ada pengeluaran tercatat.
                </p>
              ) : (
              <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name === 'Belum Ada' ? 'var(--color-line)' : PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatIDR(value)}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-line)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--color-ink-900)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      fontWeight: '600',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap gap-x-3 gap-y-2 mt-4 w-full justify-center text-xs text-ink-700 font-medium">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          entry.name === 'Belum Ada' ? 'var(--color-ink-300)' : PIE_COLORS[idx % PIE_COLORS.length],
                      }}
                    />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-line mt-4">
            <div className="bg-yellow-50/70 border border-yellow-200/80 rounded-xl p-3.5 text-xs">
              <span className="text-yellow-800 font-semibold block">Top Event Margin</span>
              <p className="font-heading font-bold text-sm text-ink-900 mt-0.5 truncate">
                {insightStats.topEventName}
              </p>
              <p className="text-yellow-800 font-bold mt-0.5">
                Laba: {formatIDR(insightStats.topEventProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Jadwal Event Terdekat & Aktivitas Studio Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jadwal Terdekat */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-800">
                  <FiCalendar className="text-sm" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-ink-900">
                    Jadwal Terdekat
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('schedule')}
                className="text-xs font-bold text-ink-700 bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Semua Jadwal
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {upcomingSchedules.length > 0 ? (
                upcomingSchedules.slice(0, 5).map((sched) => (
                  <div
                    key={sched.id}
                    className="p-3 bg-bg/70 border border-line/80 rounded-xl flex items-center gap-3.5 hover:bg-white hover:border-ink-300 transition"
                  >
                    <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold font-heading shrink-0">
                      <span className="text-sm leading-none">{format(parseISO(sched.date), 'dd')}</span>
                      <span className="text-xs uppercase leading-none mt-0.5">{format(parseISO(sched.date), 'MMM')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink-900 font-bold text-xs truncate">
                        {sched.event_name || 'Event Booked'}
                      </p>
                      <p className="text-ink-500 text-xs mt-0.5 font-normal">
                        {format(parseISO(sched.date), 'EEEE, dd MMMM yyyy')}
                      </p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      Booked
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-ink-500 font-medium">
                  Belum ada jadwal mendatang terdaftar. Klik &quot;Semua Jadwal&quot; untuk menambahkan.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Aktivitas Studio Terkini */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-800">
                  <FiActivity className="text-sm" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-ink-900">
                    Aktivitas
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Feed</span>
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              <div className="p-3 bg-bg/70 border border-line/80 rounded-xl flex items-start gap-3 hover:bg-white hover:border-ink-300 transition">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 mt-0.5">
                  <FiVolume2 className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 leading-snug">
                    Nomor A-14 dipanggil di panggung photobooth
                  </p>
                  <span className="text-xs text-ink-500 tabular-nums mt-0.5 block">2 menit lalu</span>
                </div>
              </div>

              <div className="p-3 bg-bg/70 border border-line/80 rounded-xl flex items-start gap-3 hover:bg-white hover:border-ink-300 transition">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 mt-0.5">
                  <FiFileText className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 leading-snug">
                    Invoice INV-202610-009 diterbitkan untuk PT BCA Finance
                  </p>
                  <span className="text-xs text-ink-500 tabular-nums mt-0.5 block">15 menit lalu</span>
                </div>
              </div>

              <div className="p-3 bg-bg/70 border border-line/80 rounded-xl flex items-start gap-3 hover:bg-white hover:border-ink-300 transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheckCircle className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 leading-snug">
                    Pelunasan tagihan Rp 2.500.000 terverifikasi (LUNAS)
                  </p>
                  <span className="text-xs text-ink-500 tabular-nums mt-0.5 block">42 menit lalu</span>
                </div>
              </div>

              <div className="p-3 bg-bg/70 border border-line/80 rounded-xl flex items-start gap-3 hover:bg-white hover:border-ink-300 transition">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 mt-0.5">
                  <FiUsers className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 leading-snug">
                    12 Tamu baru mendaftar antrian via Kios QR panggung
                  </p>
                  <span className="text-xs text-ink-500 tabular-nums mt-0.5 block">1 jam lalu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

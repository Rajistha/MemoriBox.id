'use client';

import React, { useState, useEffect } from 'react';
import { FiCalendar, FiTrash2, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/components/ui/ModalProvider';
import { formatDate, toYmd, todayYmd } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export function AdminSchedule() {
  const { open, confirm, notify } = useModal();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'

  // Month state for mini calendar
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('booked_dates')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data && data.length > 0) {
        setSchedules(
          data.map((item) => ({
            id: item.id,
            date: item.date,
            eventName: item.event_name || 'Event Booked',
          }))
        );
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error('Gagal memuat jadwal:', err);
      toast.error('Gagal memuat jadwal dari database');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { data, error } = await supabase
          .from('booked_dates')
          .select('*')
          .order('date', { ascending: true });

        if (!ignore) {
          if (!error && data && data.length > 0) {
            setSchedules(
              data.map((item) => ({
                id: item.id,
                date: item.date,
                eventName: item.event_name || 'Event Booked',
              }))
            );
          } else {
            setSchedules([]);
          }
        }
      } catch (err) {
        console.error('Gagal memuat jadwal:', err);
        if (!ignore) {
          toast.error('Gagal memuat jadwal dari database');
          setSchedules([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleAddScheduleForDate = (dateStr) => {
    const AddScheduleModal = ({ onClose }) => {
      const [name, setName] = useState('');
      const [saving, setSaving] = useState(false);

      const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        const trimmed = name.trim();
        const payload = {
          date: dateStr,
          event_name: trimmed,
        };

        try {
          // Database otomatis membuat acara terkait (Kas, Antrean, Sesi) lewat trigger.
          const { data, error } = await supabase.from('booked_dates').insert([payload]).select().single();
          if (error) throw error;
          setSchedules((prev) => [...prev, { id: data.id, date: data.date, eventName: data.event_name }]);

          notify({
            tone: 'success',
            title: 'Jadwal Dikunci',
            message: `"${trimmed}" pada ${formatDate(dateStr)} tersimpan. Acara otomatis muncul di Kas, Antrean, dan Sesi.`,
          });
          onClose();
        } catch (err) {
          console.error('Simpan jadwal gagal:', err);
          toast.error(`Gagal menyimpan jadwal: ${err?.message || 'Error'}`);
        } finally {
          setSaving(false);
        }
      };

      return (
        <div className="p-6 bg-white border border-line rounded-2xl shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <h3 className="font-heading font-bold text-lg text-ink-900">
              Kunci Jadwal Booked
            </h3>
          </div>
          <div className="mb-4">
            <Input
              label="Nama Acara / Klien"
              placeholder="Contoh: Wedding Cindy & Arya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!name.trim() || saving}
              onClick={handleSave}
              className="py-2 px-5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </div>
      );
    };

    open(<AddScheduleModal />);
  };

  const handleDeleteSchedule = async (sched) => {
    const ok = await confirm({
      title: 'Batalkan Jadwal?',
      message: `Yakin ingin membatalkan jadwal "${sched.eventName || 'Event'}" pada ${formatDate(sched.date)}? Tanggal ini akan kembali berstatus TERSEDIA.`,
      confirmText: 'Ya, Hapus Jadwal',
      tone: 'danger',
    });

    if (ok) {
      try {
        const { error } = await supabase.from('booked_dates').delete().eq('id', sched.id);
        if (error) throw error;
        setSchedules((prev) => prev.filter((s) => s.id !== sched.id));
        notify({
          tone: 'success',
          title: 'Jadwal Dibatalkan',
          message: 'Acara terkait ikut dihapus bila belum punya sesi, transaksi, atau antrean. Jika sudah punya data, acara tetap ada di Kas.',
        });
      } catch (err) {
        console.error('Hapus jadwal gagal:', err);
        toast.error(`Gagal membatalkan jadwal: ${err?.message || 'Error'}`);
      }
    }
  };

  const todayStr = todayYmd();
  const upcomingList = schedules.filter((s) => s.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const pastList = schedules.filter((s) => s.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));

  const displayList = activeTab === 'upcoming' ? upcomingList : pastList;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-9 h-9 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner - Clean Studio Header */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-ink-900">
            Jadwal
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            handleAddScheduleForDate(toYmd(tomorrow));
          }}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <FiPlus className="text-base" />
          <span>Kunci Tanggal</span>
        </button>
      </div>

      {/* Main Grid: Calendar + Schedule List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Picker (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-line rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
            <h3 className="font-heading font-bold text-lg text-ink-900">
              {monthNames[month]} {year}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-bg flex items-center justify-center text-ink-700 transition cursor-pointer"
                aria-label="Bulan Sebelumnya"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-bg flex items-center justify-center text-ink-700 transition cursor-pointer"
                aria-label="Bulan Berikutnya"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-ink-500 uppercase tracking-wider mb-2">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = new Date(year, month, day);
              const dateStr = toYmd(d);
              const sched = schedules.find((s) => s.date === dateStr);
              const isBooked = !!sched;
              const isPast = dateStr < todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    if (sched) {
                      handleDeleteSchedule(sched);
                    } else {
                      handleAddScheduleForDate(dateStr);
                    }
                  }}
                  className={`h-10 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                    isBooked
                      ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-bold'
                      : isPast
                      ? 'bg-bg border border-line text-ink-300'
                      : 'bg-white border border-line text-ink-700 hover:bg-yellow-50 hover:border-yellow-300 hover:text-ink-900 shadow-2xs'
                  }`}
                  title={sched ? `Booked: ${sched.eventName}` : 'Tersedia (Klik untuk kunci)'}
                >
                  <span>{day}</span>
                  {isBooked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-line flex items-center justify-center gap-6 text-xs text-ink-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-white border border-ink-300 shadow-2xs" />
              <span>Tersedia (Klik untuk kunci)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-red-50 border border-red-200" />
              <span>Booked (Klik untuk hapus)</span>
            </div>
          </div>
        </div>

        {/* Schedule List Side (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex rounded-xl bg-yellow-50 p-1 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-white text-ink-900 font-bold shadow-xs'
                  : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              Mendatang ({upcomingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-white text-ink-900 font-bold shadow-xs'
                  : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              Riwayat ({pastList.length})
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[400px] pr-1">
            {displayList.length === 0 ? (
              <p className="text-center py-10 text-xs text-ink-500 font-medium italic">
                Belum ada jadwal terdaftar pada tab ini.
              </p>
            ) : (
              displayList.map((sched) => (
                <div
                  key={sched.id}
                  className="p-3 bg-bg/70 border border-line/80 rounded-xl flex items-center justify-between hover:bg-white hover:border-ink-300 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 border border-yellow-200 flex items-center justify-center font-bold text-yellow-800 shrink-0">
                      <FiCalendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-xs text-ink-900 truncate">
                        {sched.eventName || 'Acara Booked'}
                      </h4>
                      <p className="text-xs text-ink-500 font-medium">
                        {formatDate(sched.date)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSchedule(sched)}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50 transition shrink-0 cursor-pointer"
                    title="Batalkan Jadwal"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSchedule;

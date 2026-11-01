'use client';

import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import { toYmd, todayYmd } from '@/lib/utils';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function CustomCalendar({
  value,
  onChange,
  bookedDates = [], // array of 'YYYY-MM-DD'
  onSelectDate,
  readOnly = false,
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const bookedSet = new Set(bookedDates);

  const selectedStr = value
    ? typeof value === 'string'
      ? value.split('T')[0]
      : toYmd(value)
    : '';

  const renderDays = () => {
    const cells = [];

    // Empty cells before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-10 w-full" />);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isBooked = bookedSet.has(dayStr);
      const isSelected = selectedStr === dayStr;
      const isToday = todayYmd() === dayStr;

      cells.push(
        <button
          key={dayStr}
          type="button"
          disabled={readOnly}
          onClick={() => {
            if (onChange) onChange(dayStr);
            if (onSelectDate) onSelectDate(dayStr, isBooked);
          }}
          className={`h-10 w-full rounded-xl flex flex-col items-center justify-center relative text-sm font-semibold transition ${
            isSelected
              ? 'bg-yellow-500 text-ink-900 shadow-sm font-bold'
              : isToday
              ? 'border border-yellow-500 text-ink-900'
              : 'hover:bg-yellow-100 text-ink-900'
          }`}
        >
          <span>{d}</span>
          {isBooked && (
            <span
              className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${
                isSelected ? 'bg-ink-900' : 'bg-danger'
              }`}
            />
          )}
        </button>
      );
    }

    return cells;
  };

  return (
    <div className="bg-surface rounded-2xl border border-line p-4 select-none shadow-card w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-yellow-700 text-lg" />
          <h4 className="font-heading font-bold text-base text-ink-900">
            {MONTHS[month]} {year}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-ink-700 hover:bg-yellow-100 transition"
            aria-label="Bulan Sebelumnya"
          >
            <FiChevronLeft className="text-lg" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-ink-700 hover:bg-yellow-100 transition"
            aria-label="Bulan Berikutnya"
          >
            <FiChevronRight className="text-lg" />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-xs font-bold py-1 ${
              idx === 0 ? 'text-danger' : 'text-ink-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4 pt-3 border-t border-line text-xs font-medium text-ink-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span>Terisi (Booked)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span>Tersedia</span>
        </div>
      </div>
    </div>
  );
}

export default CustomCalendar;

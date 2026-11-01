'use client';

import React from 'react';
import { FiCalendar, FiX } from 'react-icons/fi';
import { useModal } from '@/components/ui/ModalProvider';
import CustomCalendar from '@/components/ui/CustomCalendar';

const formatLabel = (value) => {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Field tanggal yang membuka modal kalender kustom (pengganti input type="date").
 * value/onChange memakai format 'YYYY-MM-DD'.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  clearable = false,
  className = '',
}) {
  const { open } = useModal();

  const pick = () => {
    open(
      (closeModal) => (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg text-ink-900">{label || 'Pilih Tanggal'}</h3>
            <button
              type="button"
              onClick={() => closeModal()}
              className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-yellow-50 transition"
              aria-label="Tutup"
            >
              <FiX className="text-lg" />
            </button>
          </div>
          <CustomCalendar
            value={value}
            onChange={(d) => {
              onChange(d);
              closeModal();
            }}
          />
        </div>
      ),
      { size: 'sm' }
    );
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && <span className="text-xs font-bold text-ink-700 tracking-wide">{label}</span>}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={pick}
          className="w-full h-11 pl-10 pr-9 rounded-xl border border-line bg-surface text-sm text-left text-ink-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-150"
        >
          <span className={value ? 'font-medium' : 'text-ink-300'}>
            {value ? formatLabel(value) : placeholder}
          </span>
        </button>
        <FiCalendar className="absolute left-3.5 text-ink-500 pointer-events-none text-lg" />
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-yellow-50"
            aria-label="Hapus tanggal"
          >
            <FiX className="text-base" />
          </button>
        )}
      </div>
    </div>
  );
}

export default DateField;

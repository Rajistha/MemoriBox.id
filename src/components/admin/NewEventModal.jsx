'use client';

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DateField from '@/components/ui/DateField';
import { todayLocal } from '@/lib/eventModel';

/**
 * Form acara baru (nama, tanggal, lokasi). onSubmit harus menyimpan ke database dan melempar galat bila gagal;
 * acara otomatis muncul juga di Jadwal, Kas, Antrean, dan Sesi karena semuanya membaca tabel yang sama.
 */
export function NewEventModal({ title = 'Acara Baru', onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [venue, setVenue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Nama acara wajib diisi.');
    if (!date) return setError('Tanggal acara wajib dipilih.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), date, venue: venue.trim() });
      onClose(true);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan acara.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading font-bold text-lg text-ink-900">{title}</h3>
        <button type="button" onClick={() => onClose(false)} className="size-11 -mt-2 -mr-2 flex items-center justify-center rounded-xl text-ink-500 hover:bg-yellow-50" aria-label="Tutup">
          <FiX className="text-xl" />
        </button>
      </div>
      <Input label="Nama acara *" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Wedding Jessica & David" autoFocus />
      <DateField label="Tanggal acara *" value={date} onChange={setDate} />
      <Input label="Lokasi / venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Opsional" />
      {error && <p className="text-sm text-danger font-medium" role="alert">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-line">
        <Button variant="secondary" onClick={() => onClose(false)}>Batal</Button>
        <Button type="submit" variant="primary" loading={busy}>Buat Acara</Button>
      </div>
    </form>
  );
}

export default NewEventModal;

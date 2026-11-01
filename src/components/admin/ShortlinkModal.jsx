'use client';

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ROOT_DOMAIN } from '@/lib/domains';

// Kata yang dipakai halaman situs; tidak boleh jadi slug karena akan tertutup.
const RESERVED = ['admin', 'queue', 'short', 'links', 'bio', 'sesi', 'pricelist', 'paket', 'jadwal', 'galeri', 'kalkulator', 'login', 'api', 'sites', 'display', 'qr', 'crew'];

export const cleanSlug = (v) => String(v || '').toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');

/** Satu form untuk membuat shortlink: slug dan alamat tujuan sekaligus. onSubmit harus menyimpan ke database dan melempar galat bila gagal. */
export function ShortlinkModal({ existing = [], onSubmit, onClose }) {
  const [slug, setSlug] = useState('');
  const [destination, setDestination] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const clean = cleanSlug(slug);
    const url = destination.trim();
    if (!clean) return setError('Slug wajib diisi (huruf kecil, angka, tanda hubung).');
    if (RESERVED.includes(clean)) return setError(`"/${clean}" dipakai halaman situs. Pilih slug lain.`);
    if (existing.some((l) => l.slug === clean)) return setError(`Slug "/${clean}" sudah digunakan.`);
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) return setError('Alamat tujuan harus berawalan http:// atau https://.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ slug: clean, destination: url });
      onClose(true);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan shortlink.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading font-bold text-lg text-ink-900">Buat Shortlink</h3>
        <button type="button" onClick={() => onClose(false)} className="size-11 -mt-2 -mr-2 flex items-center justify-center rounded-xl text-ink-500 hover:bg-yellow-50" aria-label="Tutup">
          <FiX className="text-xl" />
        </button>
      </div>
      <div>
        <Input label="Slug *" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="promo-november" autoFocus />
        <p className="mt-1.5 text-sm text-ink-500 break-all">{ROOT_DOMAIN}/{cleanSlug(slug) || 'slug'}</p>
      </div>
      <Input label="Alamat tujuan *" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="https://..." inputMode="url" />
      {error && <p className="text-sm text-danger font-medium" role="alert">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-line">
        <Button variant="secondary" onClick={() => onClose(false)}>Batal</Button>
        <Button type="submit" variant="primary" loading={busy}>Simpan</Button>
      </div>
    </form>
  );
}

export default ShortlinkModal;

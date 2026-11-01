'use client';

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatNumberWithDots } from '@/lib/utils';

const num = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/**
 * Satu modal pengaturan skema harga & bagi hasil acara (dibuka dari ikon pengaturan).
 * Mode Voucher: bagi hasil = jumlah sesi voucher x bagi hasil per voucher.
 * Mode Persentase: bagi hasil = persentase dari pemasukan sesi.
 */
export function PricingConfigModal({ event, onSave, onClose }) {
  const [mode, setMode] = useState(event.pricing_mode === 'percent' ? 'percent' : 'voucher');
  const [f, setF] = useState({
    voucher_price: formatNumberWithDots(event.voucher_price),
    no_voucher_price: formatNumberWithDots(event.no_voucher_price),
    session_price: formatNumberWithDots(event.session_price),
    print_price: formatNumberWithDots(event.print_price),
    share_per_voucher: formatNumberWithDots(event.share_per_voucher),
    share_percent: String(event.share_percent ?? 0),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const money = (key) => ({
    value: f[key] === '0' ? '' : f[key],
    inputMode: 'numeric',
    onChange: (e) => setF({ ...f, [key]: formatNumberWithDots(e.target.value) === '0' ? '' : formatNumberWithDots(e.target.value) }),
    placeholder: '0',
  });

  const submit = async (e) => {
    e.preventDefault();
    const percent = Number(String(f.share_percent).replace(',', '.')) || 0;
    if (percent < 0 || percent > 100) return setError('Persentase harus antara 0 dan 100.');
    setError('');
    setBusy(true);
    try {
      await onSave({
        pricing_mode: mode,
        voucher_price: num(f.voucher_price),
        no_voucher_price: num(f.no_voucher_price),
        session_price: num(f.session_price),
        print_price: num(f.print_price),
        share_per_voucher: num(f.share_per_voucher),
        share_percent: percent,
      });
      onClose(true);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan pengaturan.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading font-bold text-lg text-ink-900">Pengaturan harga &amp; bagi hasil</h3>
        <button type="button" onClick={() => onClose(false)} className="size-11 -mt-2 -mr-2 flex items-center justify-center rounded-xl text-ink-500 hover:bg-yellow-50" aria-label="Tutup">
          <FiX className="text-xl" />
        </button>
      </div>

      <div className="flex p-1 bg-yellow-50 border border-line rounded-xl" role="tablist" aria-label="Mode skema">
        {[
          ['voucher', 'Mode Voucher'],
          ['percent', 'Mode Persentase'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`flex-1 h-11 rounded-lg text-sm font-bold transition-colors ${mode === value ? 'bg-yellow-500 text-ink-900 shadow-sm' : 'text-ink-700 hover:bg-yellow-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'voucher' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Harga voucher (Rp)" {...money('voucher_price')} />
          <Input label="Harga non-voucher (Rp)" {...money('no_voucher_price')} />
          <Input label="Biaya cetak tambahan (Rp)" {...money('print_price')} />
          <Input label="Bagi hasil per voucher (Rp)" {...money('share_per_voucher')} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Tarif per sesi (Rp)" {...money('session_price')} />
          <Input label="Biaya cetak tambahan (Rp)" {...money('print_price')} />
          <Input
            label="Bagi hasil (% dari pemasukan)"
            inputMode="decimal"
            value={f.share_percent}
            onChange={(e) => setF({ ...f, share_percent: e.target.value })}
            placeholder="0"
          />
        </div>
      )}

      <p className="text-sm text-ink-500">
        {mode === 'voucher'
          ? 'Bagi hasil = jumlah sesi voucher × bagi hasil per voucher.'
          : 'Bagi hasil = persentase dari total pemasukan sesi.'}
      </p>

      {error && <p className="text-sm text-danger font-medium" role="alert">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-line">
        <Button variant="secondary" onClick={() => onClose(false)}>Batal</Button>
        <Button type="submit" variant="primary" loading={busy}>Simpan</Button>
      </div>
    </form>
  );
}

export default PricingConfigModal;

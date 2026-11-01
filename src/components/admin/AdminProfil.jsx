'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSave, FiPlus, FiTrash2, FiUser, FiMapPin, FiCheckCircle, FiCreditCard, FiFileText, FiHelpCircle, FiGrid } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { SITE_PROFILE_KEY, DEFAULT_PROFILE, normalizeProfile } from '@/lib/siteProfile';
import { DEFAULT_TNC } from '@/lib/pricelistDefaults';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CustomListbox from '@/components/ui/CustomListbox';
import { SERVICE_ICONS } from '@/lib/serviceIcons';
import { Skeleton } from '@/components/ui/Skeleton';

const card = 'bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-card space-y-4';

function CardTitle({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2.5 font-heading font-bold text-base text-ink-900 pb-3 border-b border-line">
      <span className="size-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center">
        <Icon size={16} />
      </span>
      {children}
    </h3>
  );
}

const areaCls =
  'w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none';

export default function AdminProfil() {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase.from('settings').select('value').eq('key', SITE_PROFILE_KEY).maybeSingle();
      if (error) throw error;
      setForm(normalizeProfile(data?.value));
      setDirty(false);
    } catch (err) {
      console.error('Gagal memuat profil:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const set = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const setBank = (patch) => set({ bank: { ...form.bank, ...patch } });

  const updateList = (key, index, value) => set({ [key]: form[key].map((x, i) => (i === index ? value : x)) });
  const removeFromList = (key, index) => set({ [key]: form[key].filter((_, i) => i !== index) });

  const save = async () => {
    setSaving(true);
    try {
      const value = normalizeProfile({ ...form, highlights: form.highlights, terms: form.terms });
      const { error } = await supabase
        .from('settings')
        .upsert({ key: SITE_PROFILE_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      setForm(value);
      setDirty(false);
      toast.success('Profil disimpan');
    } catch (err) {
      console.error('Simpan profil gagal:', err);
      toast.error(`Gagal menyimpan: ${err?.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">Profil</h2>
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <Button variant="primary" icon={FiSave} loading={saving} disabled={!dirty} onClick={save}>
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-danger" role="alert">
          <span className="font-semibold">Gagal memuat profil dari database.</span>
          <Button variant="secondary" size="sm" onClick={load}>Coba Lagi</Button>
        </div>
      )}

      <section className={card}>
        <CardTitle icon={FiUser}>Identitas &amp; Kontak</CardTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama brand" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="Nomor WhatsApp" inputMode="tel" value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="08123456789 atau 628123456789" />
          <Input label="Nomor tampilan" value={form.phoneDisplay} onChange={(e) => set({ phoneDisplay: e.target.value })} placeholder="+62 812-3456-789" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          <Input label="Instagram" value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="username tanpa @" />
          <Input label="TikTok" value={form.tiktok} onChange={(e) => set({ tiktok: e.target.value })} placeholder="username tanpa @" />
        </div>
      </section>

      <section className={card}>
        <CardTitle icon={FiMapPin}>Lokasi &amp; Area Layanan</CardTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Alamat" value={form.address} onChange={(e) => set({ address: e.target.value })} />
          <Input label="Kota basecamp" value={form.base} onChange={(e) => set({ base: e.target.value })} />
          <Input label="Area layanan" value={form.area} onChange={(e) => set({ area: e.target.value })} />
          <Input label="Lokasi di peta" value={form.mapQuery} onChange={(e) => set({ mapQuery: e.target.value })} placeholder="mis. DKI Jakarta, Indonesia" />
        </div>
      </section>

      <section className={card}>
        <CardTitle icon={FiGrid}>Layanan</CardTitle>
        <div className="space-y-4">
          {form.services.map((sv, i) => (
            <div key={i} className="rounded-xl border border-line p-3.5 space-y-3">
              <div className="grid sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <CustomListbox
                    label="Ikon"
                    options={Object.entries(SERVICE_ICONS).map(([value, { label }]) => ({ value, label }))}
                    value={sv.icon}
                    onChange={(v) => set({ services: form.services.map((x, j) => (j === i ? { ...x, icon: v } : x)) })}
                  />
                </div>
                <div className="sm:col-span-7">
                  <Input
                    label="Judul"
                    value={sv.title}
                    onChange={(e) => set({ services: form.services.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set({ services: form.services.filter((_, j) => j !== i) })}
                  className="sm:col-span-1 size-11 flex items-center justify-center rounded-xl border border-line text-ink-700 hover:bg-red-50 hover:text-danger justify-self-end"
                  aria-label={`Hapus layanan ${i + 1}`}
                >
                  <FiTrash2 />
                </button>
              </div>
              <textarea
                rows={2}
                value={sv.desc}
                onChange={(e) => set({ services: form.services.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })}
                placeholder="Deskripsi singkat"
                aria-label={`Deskripsi layanan ${i + 1}`}
                className={areaCls}
              />
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" icon={FiPlus} onClick={() => set({ services: [...form.services, { icon: 'star', title: '', desc: '' }] })}>
          Tambah layanan
        </Button>
      </section>

      <section className={card}>
        <CardTitle icon={FiGrid}>Tampilan Hero</CardTitle>
        <label className="flex items-start gap-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            checked={form.heroMosaic}
            onChange={(e) => set({ heroMosaic: e.target.checked })}
            className="mt-1 size-5 accent-yellow-500 shrink-0"
          />
          <span>
            <span className="block text-sm font-bold text-ink-900">Tampilkan foto galeri dan logo klien bergerak</span>
            <span className="block text-sm text-ink-500 mt-0.5">Sisi kanan hero berisi foto galeri dan logo klien yang selang-seling dan bergeser ke samping. Bila nonaktif atau belum ada foto/logo, tampil maskot.</span>
          </span>
        </label>
      </section>

      <section className={card}>
        <CardTitle icon={FiCheckCircle}>Poin Unggulan (hero)</CardTitle>
        <div className="space-y-2">
          {form.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={h}
                onChange={(e) => updateList('highlights', i, e.target.value)}
                aria-label={`Poin ${i + 1}`}
                className="flex-1 min-w-0 h-11 bg-surface border border-line rounded-xl px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button type="button" onClick={() => removeFromList('highlights', i)} className="size-11 shrink-0 flex items-center justify-center rounded-xl border border-line text-ink-700 hover:bg-red-50 hover:text-danger" aria-label={`Hapus poin ${i + 1}`}>
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
        {form.highlights.length < 4 && (
          <Button variant="secondary" size="sm" icon={FiPlus} onClick={() => set({ highlights: [...form.highlights, ''] })}>
            Tambah poin
          </Button>
        )}
      </section>

      <section className={card}>
        <CardTitle icon={FiCreditCard}>Rekening Pembayaran</CardTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama bank" value={form.bank.bankName} onChange={(e) => setBank({ bankName: e.target.value })} />
          <Input label="Nomor rekening" inputMode="numeric" value={form.bank.accountNumber} onChange={(e) => setBank({ accountNumber: e.target.value })} />
          <Input label="Atas nama" value={form.bank.accountHolder} onChange={(e) => setBank({ accountHolder: e.target.value })} />
          <Input label="Catatan QRIS / metode lain" value={form.bank.qrisNote} onChange={(e) => setBank({ qrisNote: e.target.value })} />
        </div>
      </section>

      <section className={card}>
        <CardTitle icon={FileTextIcon}>Syarat &amp; Ketentuan</CardTitle>
        <div className="space-y-2">
          {form.terms.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                rows={2}
                value={t}
                onChange={(e) => updateList('terms', i, e.target.value)}
                aria-label={`Syarat ${i + 1}`}
                className={areaCls}
              />
              <button type="button" onClick={() => removeFromList('terms', i)} className="size-11 shrink-0 flex items-center justify-center rounded-xl border border-line text-ink-700 hover:bg-red-50 hover:text-danger" aria-label={`Hapus syarat ${i + 1}`}>
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={FiPlus} onClick={() => set({ terms: [...form.terms, ''] })}>
            Tambah syarat
          </Button>
          {form.terms.length === 0 && (
            <Button variant="secondary" size="sm" onClick={() => set({ terms: [...DEFAULT_TNC] })}>
              Mulai dari contoh syarat
            </Button>
          )}
        </div>
      </section>

      <section className={card}>
        <CardTitle icon={FiHelpCircle}>FAQ</CardTitle>
        <div className="space-y-4">
          {form.faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-line p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  value={f.q}
                  onChange={(e) => set({ faqs: form.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })}
                  placeholder="Pertanyaan"
                  aria-label={`Pertanyaan ${i + 1}`}
                  className="flex-1 min-w-0 h-11 bg-surface border border-line rounded-xl px-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button type="button" onClick={() => set({ faqs: form.faqs.filter((_, j) => j !== i) })} className="size-11 shrink-0 flex items-center justify-center rounded-xl border border-line text-ink-700 hover:bg-red-50 hover:text-danger" aria-label={`Hapus FAQ ${i + 1}`}>
                  <FiTrash2 />
                </button>
              </div>
              <textarea
                rows={3}
                value={f.a}
                onChange={(e) => set({ faqs: form.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })}
                placeholder="Jawaban"
                aria-label={`Jawaban ${i + 1}`}
                className={areaCls}
              />
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" icon={FiPlus} onClick={() => set({ faqs: [...form.faqs, { q: '', a: '' }] })}>
          Tambah FAQ
        </Button>
      </section>
    </div>
  );
}

function FileTextIcon(props) {
  return <FiFileText {...props} />;
}

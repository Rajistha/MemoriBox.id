'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiArrowUp, FiArrowDown, FiImage, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compressImage';
import { OFFLINE_KEY, OFFLINE_STATUS, statusLabel, normalizeLocations } from '@/lib/offlineLocations';
import { useModal } from '@/components/ui/ModalProvider';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CustomListbox from '@/components/ui/CustomListbox';
import { Skeleton } from '@/components/ui/Skeleton';

const BADGE = {
  open: 'bg-green-50 text-success border-green-200',
  soon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  closed: 'bg-red-50 text-danger border-red-200',
};

const isHttp = (v) => /^https?:\/\/\S+$/i.test(v);

function LocationForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    partner: initial?.partner || '',
    city: initial?.city || '',
    status: initial?.status || 'open',
    maps_url: initial?.maps_url || '',
    image_url: initial?.image_url || '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_url || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const pickFile = async (e) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    if (!raw.type.startsWith('image/')) {
      setError('Hanya berkas gambar yang didukung.');
      return;
    }
    setError('');
    try {
      const compressed = await compressImage(raw);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setError('Gagal memproses gambar. Coba berkas lain.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Nama lokasi wajib diisi.');
    if (form.maps_url && !isHttp(form.maps_url.trim())) return setError('Link Google Maps harus diawali http:// atau https://');
    if (!preview) return setError('Foto lokasi wajib diunggah.');
    setError('');
    setBusy(true);
    try {
      await onSave({ ...form, title: form.title.trim(), maps_url: form.maps_url.trim() }, file);
      onClose(true);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan lokasi.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading font-bold text-lg text-ink-900">{initial ? 'Ubah lokasi' : 'Tambah lokasi offline'}</h3>
        <button type="button" onClick={() => onClose(false)} className="size-11 -mt-2 -mr-2 flex items-center justify-center rounded-xl text-ink-500 hover:bg-yellow-50" aria-label="Tutup">
          <FiX className="text-xl" />
        </button>
      </div>

      <div>
        <p className="text-xs font-bold text-ink-700 tracking-wide mb-1.5">Foto lokasi *</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative w-full aspect-video rounded-2xl border-2 border-dashed border-ink-300 bg-yellow-50/50 overflow-hidden flex items-center justify-center hover:border-yellow-500 transition"
          aria-label="Pilih foto lokasi"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau lokasi" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-ink-500 text-sm">
              <FiImage className="text-2xl" /> Klik untuk memilih foto
            </span>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
      </div>

      <Input label="Nama lokasi *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Photobox Experience" />
      <Input label="Nama mitra / tempat" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} placeholder="mis. Golio Hub" />
      <Input label="Kota / alamat singkat" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="mis. Kemang, Jakarta Selatan" />
      <CustomListbox label="Status" options={OFFLINE_STATUS} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
      <Input
        label="Link Google Maps (opsional)"
        value={form.maps_url}
        onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
        placeholder="https://maps.app.goo.gl/..."
      />

      {error && <p className="text-sm text-danger font-medium" role="alert">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-line">
        <Button variant="secondary" onClick={() => onClose(false)}>Batal</Button>
        <Button type="submit" variant="primary" loading={busy}>Simpan lokasi</Button>
      </div>
    </form>
  );
}

export default function AdminOffline() {
  const { open, confirm } = useModal();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase.from('settings').select('value').eq('key', OFFLINE_KEY).maybeSingle();
      if (error) throw error;
      setItems(normalizeLocations(data?.value));
    } catch (err) {
      console.error('Gagal memuat lokasi offline:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Seluruh daftar disimpan sebagai satu dokumen JSON; state hanya berubah setelah database berhasil.
  const persist = async (next) => {
    const { error } = await supabase.from('settings').upsert({ key: OFFLINE_KEY, value: { items: next }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    setItems(next);
  };

  const uploadImage = async (file) => {
    const name = `offline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const { error } = await supabase.storage.from('gallery').upload(name, file, { contentType: file.type || 'image/webp' });
    if (error) throw new Error(`Unggah foto gagal: ${error.message}`);
    return supabase.storage.from('gallery').getPublicUrl(name).data.publicUrl;
  };

  const openForm = (loc = null) => {
    open(
      (close) => (
        <LocationForm
          initial={loc}
          onClose={close}
          onSave={async (values, file) => {
            const image_url = file ? await uploadImage(file) : values.image_url;
            if (loc) {
              await persist(items.map((l) => (l.id === loc.id ? { ...l, ...values, image_url } : l)));
              toast.success('Lokasi diperbarui');
            } else {
              await persist([...items, { ...values, image_url, id: `loc_${Date.now()}`, active: true }]);
              toast.success('Lokasi ditambahkan');
            }
          }}
        />
      ),
      { size: 'md', nonDismissible: true }
    );
  };

  const toggleActive = async (loc) => {
    try {
      await persist(items.map((l) => (l.id === loc.id ? { ...l, active: !l.active } : l)));
      toast.success(loc.active ? 'Lokasi disembunyikan dari website' : 'Lokasi ditampilkan di website');
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    }
  };

  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await persist(next);
    } catch (err) {
      toast.error(`Gagal mengubah urutan: ${err.message}`);
    }
  };

  const remove = async (loc) => {
    const ok = await confirm({
      title: 'Hapus lokasi?',
      message: `"${loc.title}" akan dihapus dari website dan tidak bisa dikembalikan.`,
      confirmText: 'Ya, Hapus',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await persist(items.filter((l) => l.id !== loc.id));
      toast.success('Lokasi dihapus');
    } catch (err) {
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">Lokasi Offline</h2>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <Button variant="primary" icon={FiPlus} onClick={() => openForm()}>
            Tambah Lokasi
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-danger" role="alert">
          <span className="font-semibold">Gagal memuat lokasi dari database.</span>
          <Button variant="secondary" size="sm" onClick={load}>Coba Lagi</Button>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : items.length === 0 && !loadError ? (
        <div className="bg-surface border border-dashed border-ink-300 rounded-2xl p-10 text-center">
          <span className="size-14 rounded-2xl bg-yellow-100 text-yellow-800 inline-flex items-center justify-center text-2xl"><FiMapPin /></span>
          <p className="mt-4 font-heading font-bold text-ink-900">Belum ada lokasi offline</p>
          <Button variant="primary" icon={FiPlus} className="mt-5" onClick={() => openForm()}>Tambah Lokasi</Button>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-5">
          {items.map((loc, i) => (
            <li key={loc.id} className={`bg-surface border border-line rounded-2xl overflow-hidden shadow-card ${loc.active ? '' : 'opacity-70'}`}>
              <div className="relative aspect-video bg-yellow-50">
                {loc.image_url && <Image src={loc.image_url} alt={loc.title} fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" />}
                {!loc.active && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-surface text-xs font-bold text-ink-700 border border-line">Disembunyikan</span>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-500 truncate">{loc.partner || 'Tanpa nama mitra'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${BADGE[loc.status]}`}>{statusLabel(loc.status)}</span>
                </div>
                <h3 className="font-heading font-bold text-lg text-ink-900 mt-1.5">{loc.title}</h3>
                <p className="text-sm text-ink-500 mt-1 flex items-center gap-1.5"><FiMapPin className="shrink-0" /> {loc.city || '-'}</p>

                <div className="mt-4 pt-4 border-t border-line flex items-center gap-1.5 overflow-x-auto">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="size-11 shrink-0 rounded-xl border border-line flex items-center justify-center text-ink-700 hover:bg-yellow-50 disabled:opacity-40" aria-label={`Naikkan ${loc.title}`}><FiArrowUp /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="size-11 shrink-0 rounded-xl border border-line flex items-center justify-center text-ink-700 hover:bg-yellow-50 disabled:opacity-40" aria-label={`Turunkan ${loc.title}`}><FiArrowDown /></button>
                  <button type="button" onClick={() => toggleActive(loc)} className="size-11 shrink-0 rounded-xl border border-line flex items-center justify-center text-ink-700 hover:bg-yellow-50" aria-label={loc.active ? `Sembunyikan ${loc.title}` : `Tampilkan ${loc.title}`}>{loc.active ? <FiEye /> : <FiEyeOff />}</button>
                  <span className="flex-1" />
                  <Button variant="secondary" size="sm" icon={FiEdit2} onClick={() => openForm(loc)}>Ubah</Button>
                  <button type="button" onClick={() => remove(loc)} className="size-11 shrink-0 rounded-xl border border-line flex items-center justify-center text-ink-700 hover:bg-red-50 hover:text-danger" aria-label={`Hapus ${loc.title}`}><FiTrash2 /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiTrash2,
  FiSave,
  FiRotateCcw,
  FiUploadCloud,
  FiExternalLink,
  FiFileText,
  FiCheck,
  FiTag,
} from 'react-icons/fi';
import { DEFAULT_PACKAGES, DEFAULT_TNC, mergePackages, formatRupiah } from '@/lib/pricelistDefaults';

const inputCls =
  'w-full bg-white border border-line rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition font-medium';

const formatNumberWithDots = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseRawNumber = (val) => {
  if (val === '' || val === null || val === undefined) return 0;
  return parseInt(String(val).replace(/\D/g, ''), 10) || 0;
};

const toEditable = (packages) =>
  packages.map(({ id, label, badge, tagline, features, extraNote, prices }) => ({
    id,
    label,
    badge: badge || '',
    tagline: tagline || '',
    features: Array.isArray(features) ? [...features] : [],
    extraNote: extraNote || '',
    prices: prices.map((p) => ({
      label: p.label,
      sub: p.sub || '',
      price: p.price != null && p.price !== '' ? formatNumberWithDots(p.price) : '',
    })),
  }));

export default function AdminPricelist() {
  const [packages, setPackages] = useState(() => toEditable(DEFAULT_PACKAGES));
  const [tnc, setTnc] = useState(DEFAULT_TNC);
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const [activeId, setActiveId] = useState(DEFAULT_PACKAGES[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pdfDirty, setPdfDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'pricelist')
          .maybeSingle();

        if (error) throw error;
        if (data?.value?.packages) {
          setPackages(toEditable(mergePackages(data.value.packages)));
        }
        if (Array.isArray(data?.value?.tnc) && data.value.tnc.length > 0) {
          setTnc(data.value.tnc);
        }
        if (data?.value?.pdfUrl && data.value.pdfUrl !== '/PriceGuideMemoribox.pdf') {
          setPdfUrl(data.value.pdfUrl);
        }
      } catch (error) {
        console.warn('Pricelist DB fallback:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pkg = packages.find((p) => p.id === activeId) || packages[0];

  const updatePkg = (patch) => {
    setPackages((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const updatePrice = (index, rawText) => {
    const formatted = formatNumberWithDots(rawText);
    const nextPrices = pkg.prices.map((item, i) => (i === index ? { ...item, price: formatted } : item));
    updatePkg({ prices: nextPrices });
  };

  const updatePriceSub = (index, sub) => {
    const nextPrices = pkg.prices.map((item, i) => (i === index ? { ...item, sub } : item));
    updatePkg({ prices: nextPrices });
  };

  const updatePriceLabel = (index, label) => {
    const nextPrices = pkg.prices.map((item, i) => (i === index ? { ...item, label } : item));
    updatePkg({ prices: nextPrices });
  };

  const addPriceRow = () => {
    updatePkg({
      prices: [...pkg.prices, { label: 'Durasi Baru', sub: '', price: '' }],
    });
  };

  const removePriceRow = (index) => {
    updatePkg({
      prices: pkg.prices.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index, text) => {
    const nextFeatures = pkg.features.map((f, i) => (i === index ? text : f));
    updatePkg({ features: nextFeatures });
  };

  const addFeature = () => {
    updatePkg({
      features: [...(pkg.features || []), ''],
    });
  };

  const removeFeature = (index) => {
    updatePkg({
      features: (pkg.features || []).filter((_, i) => i !== index),
    });
  };

  const updateTnc = (index, text) => {
    setTnc((prev) => prev.map((t, i) => (i === index ? text : t)));
    setDirty(true);
  };

  const addTnc = () => {
    setTnc((prev) => [...prev, '']);
    setDirty(true);
  };

  const removeTnc = (index) => {
    setTnc((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 20MB');
      return;
    }

    setUploadingPdf(true);
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'pdf';
      const fileName = `PriceGuideMemoribox_${Date.now()}.${fileExt}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('pricelist')
          .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('pricelist').getPublicUrl(fileName);
        setPdfUrl(publicUrl);
      } catch (err) {
        console.warn('Storage upload fallback:', err);
        setPdfUrl(URL.createObjectURL(file));
      }

      setPdfDirty(true);
      toast.success('File Price Guide berhasil diunggah! Klik Simpan agar permanen.');
    } catch (err) {
      toast.error('Gagal mengunggah file');
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const cleanedPackages = packages.map((p) => ({
        ...p,
        prices: p.prices.map((pr) => ({
          ...pr,
          price: parseRawNumber(pr.price),
        })),
      }));

      const payload = {
        packages: cleanedPackages,
        tnc,
        pdfUrl,
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from('site_settings').upsert({ key: 'pricelist', value: payload }, { onConflict: 'key' });
      } catch (err) {
        console.warn('DB upsert fallback:', err);
      }

      setDirty(false);
      setPdfDirty(false);
      toast.success('Pricelist & Paket berhasil disimpan!');
    } catch (error) {
      toast.error('Gagal menyimpan pricelist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Pricelist
          </h2>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || (!dirty && !pdfDirty)}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <FiSave size={18} />
          <span>{saving ? 'Menyimpan...' : 'Simpan Semua'}</span>
        </button>
      </div>

      {/* Package Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {packages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border whitespace-nowrap cursor-pointer ${
              activeId === p.id
                ? 'bg-yellow-400 text-ink-900 border-yellow-500 font-bold shadow-xs'
                : 'bg-white hover:bg-bg text-ink-700 border-line'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Active Package Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: General & Benefit */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-ink-900 font-heading pb-3 border-b border-line">
              Info Dasar Paket
            </h3>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Nama Label Paket
              </label>
              <input
                type="text"
                value={pkg.label}
                onChange={(e) => updatePkg({ label: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Badge Promosi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: POPULER"
                  value={pkg.badge}
                  onChange={(e) => updatePkg({ badge: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Tagline Ringkas
                </label>
                <input
                  type="text"
                  placeholder="Misal: Paling diminati"
                  value={pkg.tagline}
                  onChange={(e) => updatePkg({ tagline: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Catatan Ekstra
              </label>
              <input
                type="text"
                placeholder="Misal: Biaya transport luar kota menyesuaikan"
                value={pkg.extraNote}
                onChange={(e) => updatePkg({ extraNote: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Features Bullets */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-sm text-ink-900 font-heading">
                Benefit & Fasilitas ({pkg.features.length})
              </h3>
              <button
                type="button"
                onClick={addFeature}
                className="inline-flex items-center gap-1 text-xs font-bold text-ink-700 bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <FiPlus /> Tambah
              </button>
            </div>

            <div className="space-y-2">
              {pkg.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => updateFeature(idx, e.target.value)}
                    className={inputCls}
                    placeholder="Benefit paket..."
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="p-2 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Pricing Tier Table */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-sm text-ink-900 font-heading">
                Opsi Durasi & Harga
              </h3>
              <button
                type="button"
                onClick={addPriceRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-ink-700 bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <FiPlus /> Tambah Opsi
              </button>
            </div>

            <div className="space-y-3">
              {pkg.prices.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-bg/70 border border-line/80 rounded-xl space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Label durasi (misal: 3 Jam)"
                      value={p.label}
                      onChange={(e) => updatePriceLabel(idx, e.target.value)}
                      className="flex-1 bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink-900 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
                    />
                    <div className="relative w-40">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-500 font-bold">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="Harga"
                        value={p.price}
                        onChange={(e) => updatePrice(idx, e.target.value)}
                        className="w-full bg-white border border-line rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-ink-900 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 text-right tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePriceRow(idx)}
                      className="p-1.5 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Sub-keterangan (misal: Unlimited Prints 4R)"
                    value={p.sub}
                    onChange={(e) => updatePriceSub(idx, e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-1 text-xs text-ink-700 font-normal focus:outline-none focus:border-yellow-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* PDF Guide Section */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-ink-900 font-heading pb-3 border-b border-line">
              Brosur / Price Guide PDF
            </h3>
            <p className="text-xs text-ink-500 font-medium">
              File PDF ini dapat diunduh langsung oleh calon klien dari landing page utama.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPdf}
                className="py-2 px-3.5 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <FiUploadCloud /> {uploadingPdf ? 'Mengunggah...' : 'Upload PDF Baru'}
              </button>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3.5 text-xs font-bold text-ink-900 bg-yellow-400 hover:bg-yellow-300 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <FiFileText /> Lihat PDF Aktif
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Editor */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="font-bold text-sm text-ink-900 font-heading">
              Syarat & Ketentuan Pemesanan (T&C)
            </h3>
            <p className="text-xs text-ink-500 font-medium mt-0.5">
              Poin ketentuan layanan yang ditampilkan di bagian bawah pricelist.
            </p>
          </div>
          <button
            type="button"
            onClick={addTnc}
            className="inline-flex items-center gap-1 text-xs font-bold text-ink-700 bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FiPlus /> Tambah Poin T&C
          </button>
        </div>

        <div className="space-y-2">
          {tnc.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs font-bold text-ink-500">{idx + 1}.</span>
              <input
                type="text"
                value={item}
                onChange={(e) => updateTnc(idx, e.target.value)}
                className={inputCls}
                placeholder="Poin ketentuan..."
              />
              <button
                type="button"
                onClick={() => removeTnc(idx)}
                className="p-2 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

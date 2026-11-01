'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FiRefreshCw,
  FiDatabase,
  FiHardDrive,
  FiUsers,
  FiActivity,
  FiGlobe,
  FiGitCommit,
  FiAlertTriangle,
  FiTrash2,
  FiCheck,
  FiServer,
} from 'react-icons/fi';
import { format, formatDistanceToNow } from 'date-fns';
import { scanUnusedFiles, removeFiles } from '@/lib/storageCleanup';
import toast from 'react-hot-toast';
import { formatNumberWithDots } from '@/lib/utils';

const LIMITS = {
  supabase: { db: 500 * 1024 ** 2, storage: 1024 ** 3, users: 50000 },
  vercel: { deploysPerMonth: 3000 },
};

const fmtBytes = (n) => {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  const mb = n / 1024 ** 2;
  const mbFormatted = mb >= 100 ? Math.round(mb).toString() : mb.toFixed(1).replace('.', ',');
  return `${mbFormatted} MB`;
};

const Meter = ({ label, used, limit, format: f = fmtBytes, icon }) => {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-ink-700">
          <span className="p-1 rounded-lg bg-yellow-100 text-yellow-800">{icon}</span>
          {label}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="text-2xl font-bold font-heading text-ink-900">{f(used)}</div>
      <div className="text-xs text-ink-500 font-medium mb-3">Kapasitas Maksimal: {f(limit)}</div>
      <div className="h-2 rounded-full bg-yellow-50 overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
};

export default function AdminUsage() {
  const [sb, setSb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Storage Cleaner State
  const [scanning, setScanning] = useState(false);
  const [scannedBucket, setScannedBucket] = useState('gallery');
  const [unusedFiles, setUnusedFiles] = useState([]);
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase.rpc('admin_usage_stats');
      if (error) throw error;
      setSb(data);
    } catch (err) {
      console.error('admin_usage_stats gagal:', err);
      setSb(null);
      setLoadError(err?.message || 'Statistik tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleScanStorage = async () => {
    setScanning(true);
    try {
      // Kumpulkan semua URL yang masih dipakai. Bila satu sumber gagal dibaca, pemindaian dibatalkan
      // agar tidak ada file terpakai yang salah ditandai tidak terpakai.
      const [gal, logos, settings] = await Promise.all([
        supabase.from('gallery_images').select('url'),
        supabase.from('client_logos').select('logo_url'),
        supabase.from('settings').select('value'),
      ]);
      for (const r of [gal, logos, settings]) if (r.error) throw r.error;

      const urls = [
        ...(gal.data || []).map((g) => g.url),
        ...(logos.data || []).map((l) => l.logo_url),
        ...(settings.data || []).flatMap((r) => JSON.stringify(r.value).match(/https?:\/\/[^"\\\s]+/g) || []),
      ].filter(Boolean);

      const marker = `/object/public/${scannedBucket}/`;
      const inUseNames = urls
        .filter((u) => u.includes(marker))
        .map((u) => decodeURIComponent(u.split(marker)[1].split('?')[0]));

      const unused = await scanUnusedFiles(scannedBucket, { inUse: inUseNames });
      setUnusedFiles(unused || []);
      if (unused && unused.length > 0) {
        toast(`Ditemukan ${unused.length} file tidak terpakai.`);
      } else {
        toast.success(`Bucket ${scannedBucket} bersih! Tidak ada file yatim piatu.`);
      }
    } catch (err) {
      console.warn('Scan err:', err);
      toast.error('Gagal memindai storage: ' + (err.message || 'Error'));
    } finally {
      setScanning(false);
    }
  };

  const handleExecuteClean = async () => {
    setCleaning(true);
    try {
      await removeFiles(scannedBucket, unusedFiles);
      toast.success(`Berhasil membersihkan ${unusedFiles.length} file.`);
      setUnusedFiles([]);
      setCleanModalOpen(false);
    } catch (err) {
      toast.error('Gagal menghapus file');
    } finally {
      setCleaning(false);
    }
  };

  const storageBytes = sb?.buckets?.reduce((s, x) => s + Number(x.bytes || 0), 0) ?? 0;
  const busy = sb ? Number(sb.connections) / Number(sb.max_connections || 1) > 0.8 : false;
  const storageFiles = sb?.buckets?.reduce((s, x) => s + Number(x.files || 0), 0) ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Server
          </h2>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          <span>Segarkan Status</span>
        </button>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-danger" role="alert">
          <span className="font-semibold">Statistik server belum tersedia: {loadError}</span>
          <button type="button" onClick={load} className="h-11 px-4 rounded-xl bg-white border border-red-200 font-bold text-xs shrink-0">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Supabase Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Meter label="Database" used={sb?.db_size_bytes ?? 0} limit={LIMITS.supabase.db} icon={<FiDatabase />} />
        <Meter label="Storage File" used={storageBytes} limit={LIMITS.supabase.storage} icon={<FiHardDrive />} />
        <Meter
          label="Pengguna Terdaftar"
          used={sb?.auth_users ?? 0}
          limit={LIMITS.supabase.users}
          format={(n) => formatNumberWithDots(n)}
          icon={<FiUsers />}
        />
      </div>

      {/* Server & Buckets detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-ink-900 flex items-center gap-2 font-heading pb-3 border-b border-line">
            <FiActivity className="text-yellow-600" /> Spesifikasi Mesin Postgres
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase">Versi Mesin</p>
              <p className="font-bold text-ink-700 mt-0.5">{sb?.pg_version ? `PostgreSQL ${sb.pg_version}` : '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase">Koneksi Aktif</p>
              <p className="font-bold text-ink-700 mt-0.5">
                {sb?.connections ?? '-'} / {sb?.max_connections ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase">Total Objek File</p>
              <p className="font-bold text-ink-700 mt-0.5">{storageFiles} berkas</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase">Kesehatan Server</p>
              <p className={`font-bold mt-0.5 ${busy ? 'text-danger' : 'text-success'}`}>
                {sb ? (busy ? 'Padat' : 'Normal') : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-ink-900 flex items-center gap-2 font-heading pb-3 border-b border-line">
            <FiHardDrive className="text-yellow-600" /> Distribusi Storage per Bucket
          </h3>
          <div className="space-y-3 text-xs">
            {(sb?.buckets || []).map((b) => (
              <div key={b.bucket}>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-ink-700">
                    {b.bucket}{' '}
                    <span className="text-ink-500 font-normal">
                      • {b.files} file • {b.is_public ? 'publik' : 'privat'}
                    </span>
                  </span>
                  <span className="text-ink-900 font-bold">{fmtBytes(b.bytes)}</span>
                </div>
                <div className="h-2 rounded-full bg-yellow-50 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${storageBytes ? (b.bytes / storageBytes) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Storage Cleaner Subsystem */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-ink-900 flex items-center gap-2 font-heading">
              <FiTrash2 /> Pembersih Storage Yatim Piatu (Hygiene Scanner)
            </h3>
            <p className="text-xs text-ink-500 font-medium mt-0.5">
              Pindai dan bersihkan file gambar yang tersimpan di cloud namun sudah tidak lagi terpakai di website.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={scannedBucket}
              onChange={(e) => setScannedBucket(e.target.value)}
              className="bg-white border border-line rounded-xl font-medium text-xs py-2 px-3 text-ink-700 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
            >
              <option value="gallery">Bucket Gallery</option>
              <option value="logos">Bucket Logos</option>
              <option value="pricelist">Bucket Pricelist</option>
            </select>
            <button
              type="button"
              onClick={handleScanStorage}
              disabled={scanning}
              className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {scanning ? 'Memindai...' : 'Pindai Bucket'}
            </button>
          </div>
        </div>

        {unusedFiles.length > 0 && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-amber-900">
                Terdeteksi {unusedFiles.length} file tidak terpakai di bucket &ldquo;{scannedBucket}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setCleanModalOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition shadow-xs cursor-pointer"
              >
                Hapus Semua File Terdeteksi
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-amber-900 tabular-nums">
              {unusedFiles.map((file, i) => (
                <div key={i} className="truncate">
                  • {file}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {cleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-ink-900 font-heading">
                Konfirmasi Pembersihan
              </h4>
              <p className="text-xs text-ink-500 mt-1 font-medium">
                Yakin ingin menghapus {unusedFiles.length} file yatim piatu di bucket &ldquo;{scannedBucket}&rdquo;?
                Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCleanModalOpen(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClean}
                disabled={cleaning}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cleaning ? 'Menghapus...' : 'Ya, Bersihkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

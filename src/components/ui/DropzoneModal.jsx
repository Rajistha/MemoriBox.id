'use client';

import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiImage, FiCheck, FiX } from 'react-icons/fi';
import { compressImage } from '@/lib/compressImage';
import Button from './Button';

export function DropzoneModal({
  title = 'Unggah Gambar',
  description = 'Format JPG, PNG, atau WebP. Gambar akan otomatis dioptimasi ke WebP.',
  onUpload,
  onClose,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (rawFile) => {
    if (!rawFile || !rawFile.type.startsWith('image/')) {
      setError('Hanya berkas gambar yang didukung');
      return;
    }
    setError('');
    setCompressing(true);

    try {
      const originalSize = rawFile.size;
      const compressed = await compressImage(rawFile);
      const compressedSize = compressed.size;

      const saving = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

      setFile(compressed);
      setStats({
        originalKb: Math.round(originalSize / 1024),
        compressedKb: Math.round(compressedSize / 1024),
        savingPercent: saving,
      });

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(compressed);
    } catch (err) {
      setError('Gagal mengompres gambar: ' + (err.message || 'Galat tidak diketahui'));
    } finally {
      setCompressing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    if (onUpload) {
      await onUpload(file);
    }
    if (onClose) onClose(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div>
          <h3 className="font-heading font-bold text-lg text-ink-900">{title}</h3>
          <p className="text-xs text-ink-500 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onClose && onClose(null)}
          className="text-ink-500 hover:text-ink-900 p-1.5 rounded-lg hover:bg-yellow-50"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Drop area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
          preview
            ? 'border-yellow-500 bg-yellow-50/50'
            : 'border-line hover:border-yellow-500 hover:bg-yellow-50/30'
        }`}
      >
        {compressing ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-ink-700">Mengompres ke WebP...</span>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Pratinjau"
              className="max-h-48 rounded-xl object-contain shadow-sm border border-line"
            />
            {stats && (
              <div className="flex items-center gap-2 text-xs font-medium text-ink-700 bg-white px-3 py-1.5 rounded-full border border-line shadow-xs">
                <span>{stats.originalKb} KB → {stats.compressedKb} KB</span>
                <span className="text-success font-bold">({stats.savingPercent}% lebih hemat)</span>
              </div>
            )}
            <span className="text-xs text-yellow-800 underline">Klik untuk mengganti gambar</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-800 flex items-center justify-center">
              <FiUploadCloud className="text-2xl" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">Seret gambar ke sini atau klik untuk memilih</p>
              <p className="text-xs text-ink-500 mt-0.5">Maksimal 1920px (otomatis diskalakan)</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-1">
        <Button variant="secondary" onClick={() => onClose && onClose(null)}>
          Batal
        </Button>
        <Button variant="primary" disabled={!file || compressing} onClick={handleSubmit}>
          Unggah Berkas
        </Button>
      </div>
    </div>
  );
}

export default DropzoneModal;

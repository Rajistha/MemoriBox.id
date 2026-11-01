/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTrash2, FiUpload, FiImage, FiPlus, FiX, FiEdit2, FiCheck } from 'react-icons/fi';
import compressImage from '@/lib/compressImage';

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20MB limit


export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const fileInputRef = useRef(null);

  // Form states
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [category, setCategory] = useState('Event');
  const [title, setTitle] = useState('Event Handled');
  const [alt, setAlt] = useState('Photobooth event Memoribox');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete state
  const [imageToDelete, setImageToDelete] = useState(null);

  // Edit state
  const [imageToEdit, setImageToEdit] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAlt, setEditAlt] = useState('');

  const CATEGORIES = ['Semua', 'Event', 'Wedding', 'Corporate', 'Birthday', 'Graduation'];

  const fetchImages = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('id, url, category, title, alt, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Gagal memuat galeri:', error);
      toast.error('Gagal memuat galeri dari database');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await fetchImages(false);
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    e.target.value = '';
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      toast.error('Format harus JPG, JPEG, PNG, atau WebP');
      return;
    }
    if (selected.size > MAX_INPUT_BYTES) {
      toast.error('Ukuran file maksimal 20 MB');
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(selected);
      setFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      const kb = (n) => (n / 1024).toFixed(0);
      toast.success(`Dikompres: ${kb(selected.size)} KB → ${kb(compressed.size)} KB (WebP)`);
    } catch (error) {
      toast.error('Gagal mengompres gambar: ' + (error.message || 'Unknown error'));
    } finally {
      setCompressing(false);
    }
  };

  const openAddModal = () => {
    setFile(null);
    setPreviewUrl('');
    setCategory('Event');
    setTitle('Event Handled');
    setAlt('Photobooth event Memoribox');
    setIsModalOpen(true);
  };

  const closeAddModal = () => {
    setIsModalOpen(false);
    setFile(null);
    setPreviewUrl('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file && !previewUrl) {
      toast.error('Pilih gambar terlebih dahulu!');
      return;
    }

    setUploading(true);
    try {
      let publicUrl = previewUrl;

      if (file) {
        const fileExt = file.name ? file.name.split('.').pop() : 'webp';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(fileName);
        publicUrl = publicUrlData.publicUrl;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('gallery_images')
        .insert([{ url: publicUrl, category, title, alt }])
        .select()
        .single();
      if (insertError) throw insertError;

      setImages((prev) => [inserted, ...prev]);
      toast.success('Foto berhasil ditambahkan ke galeri!');
      closeAddModal();
    } catch (error) {
      toast.error('Gagal mengunggah foto: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (img) => {
    setImageToEdit(img);
    setEditTitle(img.title || '');
    setEditCategory(img.category || 'Event');
    setEditAlt(img.alt || '');
  };

  const closeEditModal = () => {
    setImageToEdit(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!imageToEdit) return;

    setUploading(true);
    try {
      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({ title: editTitle, category: editCategory, alt: editAlt })
        .eq('id', imageToEdit.id);
      if (updateError) throw updateError;

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageToEdit.id
            ? { ...img, title: editTitle, category: editCategory, alt: editAlt }
            : img
        )
      );
      toast.success('Data foto berhasil diperbarui!');
      closeEditModal();
    } catch (error) {
      toast.error('Gagal memperbarui: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    setUploading(true);
    try {
      const { error: deleteError } = await supabase.from('gallery_images').delete().eq('id', imageToDelete.id);
      if (deleteError) throw deleteError;
      setImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
      toast.success('Foto berhasil dihapus!');
      setImageToDelete(null);
    } catch (error) {
      toast.error('Gagal menghapus foto');
    } finally {
      setUploading(false);
    }
  };

  const filteredImages =
    activeCategory === 'Semua' ? images : images.filter((img) => img.category === activeCategory);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Galeri
          </h2>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <FiPlus size={18} />
          <span>Tambah Foto Baru</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border whitespace-nowrap cursor-pointer ${
              activeCategory === cat
                ? 'bg-yellow-400 text-ink-900 border-yellow-500 font-bold shadow-xs'
                : 'bg-white hover:bg-bg text-ink-700 border-line'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Display */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div
          style={{ gridAutoRows: '220px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 grid-flow-dense"
        >
          {filteredImages.map((img) => {
            return (
              <div
                key={img.id}
                className="group relative rounded-2xl overflow-hidden bg-white border border-line shadow-xs hover:shadow-md hover:border-ink-300 transition-all"
              >
                <img
                  src={img.url}
                  alt={img.alt || img.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <span className="text-white font-bold text-xs sm:text-sm leading-tight drop-shadow">
                    {img.title}
                  </span>
                  <span className="text-yellow-300 text-xs font-semibold mt-0.5">
                    {img.category}
                  </span>
                </div>
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEditModal(img)}
                    className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-xs text-ink-700 border border-line flex items-center justify-center hover:bg-white hover:text-ink-900 transition shadow-xs cursor-pointer"
                    title="Edit"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageToDelete(img)}
                    className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-xs text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-50 transition shadow-xs cursor-pointer"
                    title="Hapus"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-base text-ink-900 font-heading">
                Tambah Foto Galeri Baru
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="p-1 rounded-lg text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Pilih File Foto</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-ink-300 hover:border-yellow-400 hover:bg-yellow-50/50 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 bg-bg"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-32 object-cover rounded-xl border border-line shadow-xs" />
                  ) : (
                    <>
                      <div className="p-3 bg-yellow-100 rounded-xl text-yellow-800">
                        <FiUpload size={20} />
                      </div>
                      <span className="text-ink-700 font-medium">
                        {compressing ? 'Mengompres otomatis ke WebP...' : 'Klik untuk memilih file (JPG, PNG, WebP)'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Judul Foto</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                  >
                    {CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading || compressing}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? 'Mengunggah...' : 'Simpan Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {imageToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-base text-ink-900 font-heading">
                Edit Data Foto
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1 rounded-lg text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Judul Foto</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                  >
                    {CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {uploading ? 'Menyimpan...' : 'Perbarui Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-ink-900 font-heading">
                Hapus Foto Ini?
              </h4>
              <p className="text-xs text-ink-500 mt-1 font-medium">
                Foto &ldquo;{imageToDelete.title}&rdquo; akan dihapus permanen dari galeri website.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

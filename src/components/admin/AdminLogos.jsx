/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTrash2, FiUpload, FiImage, FiPlus, FiX, FiEdit2, FiExternalLink, FiBriefcase } from 'react-icons/fi';


export default function AdminLogos() {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState(null);
  const [logoToDelete, setLogoToDelete] = useState(null);

  const fetchLogos = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_logos')
        .select('id, client_name, logo_url, instagram_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogos(data || []);
    } catch (error) {
      console.warn('Logos DB fallback:', error);
      toast.error('Gagal memuat logo dari database');
      setLogos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await fetchLogos(false);
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const openAddModal = (logo = null) => {
    if (logo) {
      setEditingLogo(logo);
      setClientName(logo.client_name);
      setInstagramUrl(logo.instagram_url || '');
      setPreviewUrl(logo.logo_url);
      setFile(null);
    } else {
      setEditingLogo(null);
      setClientName('');
      setInstagramUrl('');
      setPreviewUrl('');
      setFile(null);
    }
    setIsModalOpen(true);
  };

  const closeAddModal = () => {
    setIsModalOpen(false);
    setEditingLogo(null);
    setFile(null);
    setPreviewUrl('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!clientName) {
      toast.error('Nama klien wajib diisi!');
      return;
    }
    if (!editingLogo && !file && !previewUrl) {
      toast.error('Pilih file logo terlebih dahulu!');
      return;
    }

    setUploading(true);
    try {
      let publicUrl = editingLogo ? editingLogo.logo_url : previewUrl;

      if (file) {
        const fileExt = file.name ? file.name.split('.').pop() : 'png';
        const fileName = `logo_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        publicUrl = publicUrlData.publicUrl;
      }

      if (editingLogo) {
        const { error: updateError } = await supabase
          .from('client_logos')
          .update({ client_name: clientName, logo_url: publicUrl, instagram_url: instagramUrl })
          .eq('id', editingLogo.id);
        if (updateError) throw updateError;

        setLogos((prev) =>
          prev.map((l) =>
            l.id === editingLogo.id
              ? { ...l, client_name: clientName, logo_url: publicUrl, instagram_url: instagramUrl }
              : l
          )
        );
        toast.success('Logo klien diperbarui!');
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('client_logos')
          .insert([{ client_name: clientName, logo_url: publicUrl, instagram_url: instagramUrl }])
          .select()
          .single();
        if (insertError) throw insertError;

        setLogos((prev) => [inserted, ...prev]);
        toast.success('Logo klien ditambahkan!');
      }
      closeAddModal();
    } catch (error) {
      toast.error('Gagal menyimpan logo: ' + (error.message || 'Error'));
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!logoToDelete) return;
    try {
      const { error: deleteError } = await supabase.from('client_logos').delete().eq('id', logoToDelete.id);
      if (deleteError) throw deleteError;
      setLogos((prev) => prev.filter((l) => l.id !== logoToDelete.id));
      toast.success('Logo klien dihapus!');
      setLogoToDelete(null);
    } catch (error) {
      toast.error('Gagal menghapus logo');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Logo Mitra
          </h2>
        </div>
        <button
          type="button"
          onClick={() => openAddModal()}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <FiPlus size={18} />
          <span>Tambah Logo Baru</span>
        </button>
      </div>

      {/* Grid Display */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {logos.map((logo) => (
            <div
              key={logo.id}
              className="group relative bg-white border border-line rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-ink-300 transition-all shadow-xs"
            >
              <div className="w-20 h-20 rounded-xl bg-bg border border-line flex items-center justify-center p-2 mb-3 overflow-hidden">
                <img
                  src={logo.logo_url}
                  alt={logo.client_name}
                  className="max-h-full max-w-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>

              <h4 className="font-bold text-xs sm:text-sm text-ink-900 truncate max-w-full font-heading">
                {logo.client_name}
              </h4>

              {logo.instagram_url && (
                <a
                  href={logo.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-yellow-700 font-semibold hover:underline mt-1 flex items-center gap-1"
                >
                  Instagram <FiExternalLink size={10} />
                </a>
              )}

              {/* Action buttons on hover */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => openAddModal(logo)}
                  className="p-1.5 rounded-lg bg-bg border border-line text-ink-700 hover:bg-yellow-50 transition shadow-2xs cursor-pointer"
                  title="Edit"
                >
                  <FiEdit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setLogoToDelete(logo)}
                  className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition shadow-2xs cursor-pointer"
                  title="Hapus"
                >
                  <FiTrash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-base text-ink-900 font-heading">
                {editingLogo ? 'Edit Logo Klien' : 'Tambah Logo Klien Baru'}
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="p-1 rounded-lg text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Pilih File Logo</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-ink-300 hover:border-yellow-400 hover:bg-yellow-50/50 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 bg-bg"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Logo Preview" className="h-20 object-contain" />
                  ) : (
                    <>
                      <div className="p-3 bg-yellow-100 rounded-xl text-yellow-800">
                        <FiUpload size={20} />
                      </div>
                      <span className="text-ink-700 font-medium">Pilih logo (PNG transparan disarankan)</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Nama Klien / Brand</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bank Mandiri, Telkom, Tokopedia"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">
                  Tautan Profil / Instagram (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://instagram.com/nama_klien"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
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
                  disabled={uploading}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? 'Menyimpan...' : 'Simpan Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {logoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-ink-900 font-heading">Hapus Logo Ini?</h4>
              <p className="text-xs text-ink-500 mt-1 font-medium">
                Logo &ldquo;{logoToDelete.client_name}&rdquo; akan dihapus dari daftar partner.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogoToDelete(null)}
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

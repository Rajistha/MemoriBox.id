'use client';

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiUpload,
  FiLink,
  FiCamera,
  FiCalendar,
  FiTag,
  FiStar,
  FiGlobe,
  FiShare2,
  FiSettings,
  FiImage,
  FiArrowUp,
  FiArrowDown,
  FiExternalLink,
  FiX,
  FiSave,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { openExternal } from '@/lib/openExternal';
import { siteUrl, isLocalHost } from '@/lib/domains';
import { DEFAULT_LINKTREE_PROFILE, DEFAULT_LINKS } from '@/lib/linktreeDefaults';

const PRESET_ICONS = [
  { id: 'camera', label: 'Kamera', Icon: FiCamera },
  { id: 'calendar', label: 'Jadwal', Icon: FiCalendar },
  { id: 'image', label: 'Galeri', Icon: FiImage },
  { id: 'ticket', label: 'Pricelist', Icon: FiTag },
  { id: 'star', label: 'Unggulan', Icon: FiStar },
  { id: 'globe', label: 'Website', Icon: FiGlobe },
  { id: 'whatsapp', label: 'WhatsApp', Icon: FiShare2 },
  { id: 'link', label: 'Tautan', Icon: FiLink },
];

const SOCIALS = [
  { platform: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/62...' },
  { platform: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { platform: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { platform: 'website', label: 'Website', placeholder: 'https://memoribox.id' },
];

const isHeader = (item) => item.type === 'header';

export default function AdminLinks() {
  const [profile, setProfile] = useState(DEFAULT_LINKTREE_PROFILE);
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  // Link Modal State
  const [linkModal, setLinkModal] = useState(null); // { id: null | string }
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    url: '',
    badge: '',
    isHighlighted: false,
    openNewTab: false,
    isActive: true,
    icon: 'camera',
    sectionId: '',
  });

  // Section Modal State
  const [sectionModal, setSectionModal] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');

  // Profile Modal State
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(DEFAULT_LINKTREE_PROFILE);

  // Delete Modal
  const [toDelete, setToDelete] = useState(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'linktree')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        if (data.value.profile) setProfile(data.value.profile);
        if (data.value.links && Array.isArray(data.value.links)) setLinks(data.value.links);
      }
    } catch (err) {
      console.error('Gagal memuat bio-link:', err);
      toast.error('Gagal memuat bio-link dari database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await loadData(false);
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSaveAll = async (newLinks = links, newProfile = profile) => {
    try {
      const payload = {
        profile: newProfile,
        links: newLinks,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'linktree', value: payload, updated_at: payload.updated_at }, { onConflict: 'key' });
      if (error) throw error;

      setDirty(false);
      toast.success('Bio-link berhasil disimpan!');
    } catch (err) {
      console.error('Simpan bio-link gagal:', err);
      toast.error(`Gagal menyimpan bio-link: ${err?.message || 'Error'}`);
    }
  };

  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const copy = [...links];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setLinks(copy);
    setDirty(true);
  };

  const toggleActive = (id) => {
    const updated = links.map((l) => (l.id === id ? { ...l, isActive: l.isActive === false } : l));
    setLinks(updated);
    setDirty(true);
  };

  const openAddLink = () => {
    setForm({
      title: '',
      subtitle: '',
      url: '',
      badge: '',
      isHighlighted: false,
      openNewTab: false,
      isActive: true,
      icon: 'camera',
      sectionId: '',
    });
    setLinkModal({ id: null });
  };

  const openEditLink = (link) => {
    setForm({
      title: link.title || '',
      subtitle: link.subtitle || '',
      url: link.url || '',
      badge: link.badge || '',
      isHighlighted: !!link.isHighlighted,
      openNewTab: !!link.openNewTab,
      isActive: link.isActive !== false,
      icon: link.icon || 'camera',
      sectionId: '',
    });
    setLinkModal({ id: link.id });
  };

  const submitLink = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Judul dan URL wajib diisi');
      return;
    }

    if (linkModal.id) {
      const updated = links.map((l) => (l.id === linkModal.id ? { ...l, ...form } : l));
      setLinks(updated);
    } else {
      const created = {
        id: `link_${Date.now()}`,
        type: 'link',
        clicks: 0,
        ...form,
      };
      setLinks([...links, created]);
    }

    setDirty(true);
    setLinkModal(null);
  };

  const submitSection = (e) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;

    if (sectionModal?.id) {
      const updated = links.map((l) => (l.id === sectionModal.id ? { ...l, title: sectionTitle } : l));
      setLinks(updated);
    } else {
      const created = {
        id: `header_${Date.now()}`,
        type: 'header',
        title: sectionTitle,
        isActive: true,
      };
      setLinks([...links, created]);
    }

    setDirty(true);
    setSectionModal(null);
    setSectionTitle('');
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const updated = links.filter((l) => l.id !== toDelete.id);
    setLinks(updated);
    setDirty(true);
    setToDelete(null);
    toast.success('Item berhasil dihapus');
  };

  const saveProfileSettings = (e) => {
    e.preventDefault();
    setProfile(profileDraft);
    setProfileOpen(false);
    setDirty(true);
    handleSaveAll(links, profileDraft);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-4 border-line border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Tautan Bio
          </h2>
          <p className="mt-1 text-sm text-ink-500 tabular-nums">link.memoribox.id</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => openExternal(isLocalHost() ? '/bio' : siteUrl('link'))}
            className="py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-yellow-50 border border-line rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <FiExternalLink /> Buka Halaman
          </button>
          <button
            type="button"
            onClick={() => {
              setProfileDraft(structuredClone(profile));
              setProfileOpen(true);
            }}
            className="py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FiSettings /> Profil Bio
          </button>
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={!dirty}
            className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs py-2.5 px-5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <FiSave /> Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openAddLink}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FiPlus /> Tambah Tautan
        </button>
        <button
          type="button"
          onClick={() => {
            setSectionTitle('');
            setSectionModal({ id: null });
          }}
          className="py-2 px-3.5 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <FiPlus /> Tambah Header Kategori
        </button>
        <a
          href="/links"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto py-2 px-3.5 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>Pratinjau Halaman Bio</span>
          <FiExternalLink />
        </a>
      </div>

      {/* Links List */}
      <div className="space-y-3">
        {links.map((item, idx) => {
          if (isHeader(item)) {
            return (
              <div
                key={item.id}
                className="bg-yellow-50/80 border border-line rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-ink-700 bg-white px-2 py-0.5 rounded-md border border-line">
                    Kategori
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-ink-900 font-heading">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-white disabled:opacity-20 transition cursor-pointer"
                    title="Pindah ke atas"
                  >
                    <FiArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === links.length - 1}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-white disabled:opacity-20 transition cursor-pointer"
                    title="Pindah ke bawah"
                  >
                    <FiArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSectionTitle(item.title || '');
                      setSectionModal({ id: item.id });
                    }}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-white transition cursor-pointer"
                    title="Edit kategori"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(item)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="Hapus"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          }

          const IconComp = PRESET_ICONS.find((p) => p.id === item.icon)?.Icon || FiLink;

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-xs ${
                item.isActive === false
                  ? 'opacity-60 bg-bg border-line'
                  : item.isHighlighted
                  ? 'border-yellow-300 ring-2 ring-yellow-400/20'
                  : 'border-line hover:border-ink-300'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center justify-center shrink-0">
                  <IconComp size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-ink-900 truncate font-heading">
                      {item.title}
                    </h4>
                    {item.badge && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-ink-500 font-normal truncate mt-0.5">{item.subtitle}</p>
                  )}
                  <p className="text-xs text-ink-500 tabular-nums truncate mt-0.5">{item.url}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                <span className="text-xs font-semibold text-ink-700 bg-bg border border-line px-2.5 py-1 rounded-lg">
                  {item.clicks || 0} Klik
                </span>

                <button
                  type="button"
                  onClick={() => toggleActive(item.id)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    item.isActive === false
                      ? 'bg-yellow-50 text-ink-500 border-line'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                  title={item.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                >
                  {item.isActive === false ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>

                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg border border-line text-ink-700 hover:bg-bg disabled:opacity-20 transition cursor-pointer"
                  title="Pindah ke atas"
                >
                  <FiArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === links.length - 1}
                  className="p-1.5 rounded-lg border border-line text-ink-700 hover:bg-bg disabled:opacity-20 transition cursor-pointer"
                  title="Pindah ke bawah"
                >
                  <FiArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => openEditLink(item)}
                  className="p-1.5 rounded-lg border border-line text-ink-700 hover:bg-bg transition cursor-pointer"
                  title="Edit link"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(item)}
                  className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Hapus"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Link Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-base text-ink-900 font-heading">
                {linkModal.id ? 'Edit Tautan' : 'Tambah Tautan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setLinkModal(null)}
                className="p-1 rounded-lg hover:bg-yellow-50 text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={submitLink} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Judul Tautan</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Booking Jadwal Photobooth"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">
                  Sub-judul / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Misal: Cek ketersediaan tanggal & reservasi"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Target URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://... atau /#pricelist"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1.5">Ikon Tautan</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_ICONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setForm({ ...form, icon: id })}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        form.icon === id
                          ? 'bg-yellow-400 text-ink-900 border-yellow-500 font-bold shadow-xs'
                          : 'bg-white hover:bg-bg text-ink-700 border-line'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Badge (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Misal: Populer"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2 font-medium text-ink-700">
                    <input
                      type="checkbox"
                      checked={form.isHighlighted}
                      onChange={(e) => setForm({ ...form, isHighlighted: e.target.checked })}
                      className="w-4 h-4 accent-yellow-400 rounded border-ink-300"
                    />
                    <span>Sorot Utama</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModal(null)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Section Modal */}
      {sectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-base text-ink-900 font-heading">
                {sectionModal.id ? 'Edit Header Kategori' : 'Tambah Header Kategori'}
              </h3>
              <button
                type="button"
                onClick={() => setSectionModal(null)}
                className="p-1 rounded-lg hover:bg-yellow-50 text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={submitSection} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">
                  Nama Header / Kategori
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Layanan & Booking"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSectionModal(null)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Header
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-base text-ink-900 font-heading">
                Pengaturan Profil Bio-Link
              </h3>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="p-1 rounded-lg hover:bg-yellow-50 text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={saveProfileSettings} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Nama Brand</label>
                  <input
                    type="text"
                    required
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">Handle</label>
                  <input
                    type="text"
                    required
                    value={profileDraft.handle}
                    onChange={(e) => setProfileDraft({ ...profileDraft, handle: e.target.value })}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Bio Ringkas</label>
                <textarea
                  rows={2}
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-line">
                <span className="block font-semibold text-ink-700">Tautan Media Sosial</span>
                {profileDraft.socials?.map((soc, idx) => (
                  <div key={soc.platform} className="flex items-center gap-2">
                    <span className="w-20 text-xs font-semibold text-ink-700 capitalize">
                      {soc.label || soc.platform}
                    </span>
                    <input
                      type="url"
                      value={soc.url}
                      onChange={(e) => {
                        const updated = [...profileDraft.socials];
                        updated[idx].url = e.target.value;
                        setProfileDraft({ ...profileDraft, socials: updated });
                      }}
                      placeholder={`URL ${soc.platform}`}
                      className="flex-1 bg-white border border-line rounded-xl px-3 py-1.5 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-ink-900 font-heading">Hapus Item Ini?</h4>
              <p className="text-xs text-ink-500 font-medium mt-1">
                &ldquo;{toDelete.title}&rdquo; akan dihapus dari daftar bio-link.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setToDelete(null)}
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

'use client';

import React, { useState, useEffect } from 'react';
import {
  FiScissors,
  FiPlus,
  FiCopy,
  FiTrash2,
  FiExternalLink,
  FiCheck,
  FiLink,
  FiBarChart2,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiArrowUpRight,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ShortlinkModal from '@/components/admin/ShortlinkModal';
import { useModal } from '@/components/ui/ModalProvider';
import { supabase } from '@/lib/supabase';
import { formatNumberWithDots } from '@/lib/utils';


export default function AdminShort() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { confirm, open } = useModal();

  const fetchShortlinks = async () => {
    setLoading(true);
    try {
      if (supabase && supabase.from) {
        const { data, error } = await supabase
          .from('short_links')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setLinks(data);
        } else {
          setLinks([]);
        }
      } else {
        setLinks([]);
      }
    } catch (err) {
      console.warn('Shortlink DB fetch error, using local fallback:', err);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        if (supabase && supabase.from) {
          const { data, error } = await supabase
            .from('short_links')
            .select('*')
            .order('created_at', { ascending: false });

          if (!ignore && !error && data && data.length > 0) {
            setLinks(data);
          }
        }
      } catch (err) {
        console.warn('Initial load shortlink error:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Satu modal: slug dan tujuan diisi bersamaan, disimpan langsung ke database.
  const handleCreate = () => {
    open(
      (close) => (
        <ShortlinkModal
          existing={links}
          onClose={close}
          onSubmit={async ({ slug, destination }) => {
            const { data, error } = await supabase
              .from('short_links')
              .insert([{ slug, destination, title: slug, clicks: 0, is_active: true }])
              .select()
              .single();
            if (error) throw error;
            setLinks((prev) => [data, ...prev]);
            toast.success(`Shortlink /${slug} dibuat`);
          }}
        />
      ),
      { size: 'md', nonDismissible: true }
    );
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: `Hapus shortlink /${item.slug}?`,
      message: `Pengunjung yang membuka memoribox.id/${item.slug} tidak akan dialihkan lagi ke ${item.destination}.`,
      confirmText: 'Hapus Tautan',
      tone: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase.from('short_links').delete().eq('slug', item.slug);
    if (error) {
      toast.error('Gagal menghapus shortlink');
      return;
    }
    setLinks(links.filter((l) => l.slug !== item.slug));
    toast.success(`Shortlink /${item.slug} dihapus`);
  };

  const handleToggleActive = async (slug) => {
    const current = links.find((l) => l.slug === slug);
    if (!current) return;
    const next = !current.is_active;
    const { error } = await supabase.from('short_links').update({ is_active: next }).eq('slug', slug);
    if (error) {
      toast.error('Gagal memperbarui status');
      return;
    }
    setLinks((prev) => prev.map((l) => (l.slug === slug ? { ...l, is_active: next } : l)));
    toast.success(next ? 'Shortlink diaktifkan' : 'Shortlink dinonaktifkan');
  };

  const handleCopy = (slug) => {
    const url = `https://memoribox.id/${slug}`;
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      toast.success('Tautan berhasil disalin!');
      setTimeout(() => setCopiedSlug(''), 2000);
    }
  };

  const filteredLinks = links.filter(
    (l) =>
      (l.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.destination || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClicks = links.reduce((sum, l) => sum + (Number(l.clicks) || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Shortlink
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchShortlinks}
            className="p-2.5 rounded-xl border border-line bg-white hover:bg-bg text-ink-700 transition shadow-2xs cursor-pointer"
            title="Refresh data"
          >
            <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiPlus size={18} />
            <span>Buat Shortlink</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            placeholder="Cari slug atau URL tujuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-line rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-ink-900 focus:outline-none focus:border-yellow-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Table Display */}
      <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-bg text-ink-700 uppercase text-xs font-bold tracking-wider border-b border-line">
              <tr>
                <th className="py-3.5 px-5">Short URL</th>
                <th className="py-3.5 px-4">Tujuan Asli</th>
                <th className="py-3.5 px-4 text-center">Total Klik</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-ink-500">
                    Tidak ada shortlink yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((item) => (
                  <tr key={item.slug} className="hover:bg-bg/70 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2 tabular-nums font-bold text-ink-900">
                        <span className="text-yellow-600 font-bold">/</span>
                        <span>{item.slug}</span>
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5 truncate max-w-xs">
                        memoribox.id/{item.slug}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <a
                        href={item.destination}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-700 hover:text-ink-900 hover:underline flex items-center gap-1.5 max-w-md truncate"
                      >
                        <span className="truncate">{item.destination}</span>
                        <FiArrowUpRight size={13} className="shrink-0 text-ink-500" />
                      </a>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 tabular-nums font-bold text-ink-900 bg-yellow-50 px-2.5 py-0.5 rounded-full text-xs border border-line">
                        <FiBarChart2 size={12} className="text-ink-500" />
                        <span>{formatNumberWithDots(item.clicks || 0)}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item.slug)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer border transition ${
                          item.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-yellow-50 text-ink-500 border-line'
                        }`}
                      >
                        {item.is_active !== false ? (
                          <>
                            <FiEye size={12} />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <FiEyeOff size={12} />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.slug)}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            copiedSlug === item.slug
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white hover:bg-bg text-ink-700 border-line shadow-2xs'
                          }`}
                          title="Salin Link"
                        >
                          {copiedSlug === item.slug ? <FiCheck size={14} /> : <FiCopy size={14} />}
                          <span className="hidden sm:inline">
                            {copiedSlug === item.slug ? 'Tersalin' : 'Salin'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-2 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition cursor-pointer"
                          title="Hapus Shortlink"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

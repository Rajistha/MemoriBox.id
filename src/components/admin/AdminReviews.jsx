'use client';

import React, { useState, useEffect } from 'react';
import ErrorState from '@/components/ui/ErrorState';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTrash2, FiPlus, FiX, FiStar, FiEdit2 } from 'react-icons/fi';
import { format } from 'date-fns';

const PREDEFINED_TYPES = ['Wedding', 'Birthday', 'Corporate Event', 'Graduation', 'Engagement', 'Event Campus', 'Lainnya'];

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [customEventType, setCustomEventType] = useState('');

  const [formData, setFormData] = useState({
    client_name: '',
    event_type: 'Wedding',
    rating: 5,
    comment: '',
  });

  const fetchReviews = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.warn('Reviews load error:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await fetchReviews(false);
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      const isCustom = !PREDEFINED_TYPES.includes(review.event_type) && review.event_type;
      setFormData({
        client_name: review.client_name,
        event_type: isCustom ? 'Lainnya' : review.event_type || 'Wedding',
        rating: review.rating || 5,
        comment: review.comment || '',
      });
      setCustomEventType(isCustom ? review.event_type : '');
    } else {
      setEditingReview(null);
      setFormData({
        client_name: '',
        event_type: 'Wedding',
        rating: 5,
        comment: '',
      });
      setCustomEventType('');
    }
    setIsModalOpen(true);
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!formData.client_name || !formData.comment) {
      toast.error('Nama klien dan komentar wajib diisi!');
      return;
    }

    const finalEventType = formData.event_type === 'Lainnya' ? customEventType || 'Event Khusus' : formData.event_type;

    try {
      if (editingReview) {
        const updated = {
          client_name: formData.client_name,
          event_type: finalEventType,
          rating: formData.rating,
          comment: formData.comment,
        };

        const { error: updateError } = await supabase.from('reviews').update(updated).eq('id', editingReview.id);
        if (updateError) throw updateError;

        setReviews((prev) =>
          prev.map((r) => (r.id === editingReview.id ? { ...r, ...updated } : r))
        );
        toast.success('Ulasan klien diperbarui!');
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('reviews')
          .insert([{ client_name: formData.client_name, event_type: finalEventType, rating: formData.rating, comment: formData.comment }])
          .select()
          .single();
        if (insertError) throw insertError;

        setReviews((prev) => [inserted, ...prev]);
        toast.success('Ulasan klien berhasil ditambahkan!');
      }

      setIsModalOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan ulasan: ' + (error.message || 'Error'));
    }
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    try {
      const { error: deleteError } = await supabase.from('reviews').delete().eq('id', reviewToDelete.id);
      if (deleteError) throw deleteError;
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
      toast.success('Ulasan klien dihapus');
      setReviewToDelete(null);
    } catch (error) {
      toast.error('Gagal menghapus ulasan');
    }
  };

  if (loadError) {
    return <ErrorState title="Gagal memuat ulasan" onRetry={() => fetchReviews(true)} />;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading">
            Ulasan
          </h2>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-yellow-400 hover:bg-yellow-300 text-ink-900 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <FiPlus size={18} />
          <span>Tambah Ulasan</span>
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="group bg-white border border-line rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-ink-300 transition-all flex flex-col justify-between relative"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar
                        key={star}
                        size={15}
                        className={star <= (rev.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}
                      />
                    ))}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-50 text-ink-700 border border-line">
                    {rev.event_type}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-ink-700 italic leading-relaxed mb-4 font-normal">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-ink-900 font-heading">
                    {rev.client_name}
                  </h4>
                  <p className="text-xs text-ink-500 font-medium mt-0.5">
                    {rev.created_at ? format(new Date(rev.created_at), 'dd MMM yyyy') : 'Terverifikasi'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(rev)}
                    className="p-1.5 rounded-lg bg-bg border border-line text-ink-700 hover:bg-yellow-50 transition shadow-2xs cursor-pointer"
                    title="Edit"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewToDelete(rev)}
                    className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition shadow-2xs cursor-pointer"
                    title="Hapus"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
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
                {editingReview ? 'Edit Ulasan Klien' : 'Tambah Ulasan Klien Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-ink-500 hover:text-ink-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Nama Klien / Instansi</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Cindy Paramitha & Arya Pratama"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Jenis Acara</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                >
                  {PREDEFINED_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {formData.event_type === 'Lainnya' && (
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">
                    Sebutkan Jenis Acara
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Reuni Akbar, Arisan Keluarga"
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value)}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-ink-700 mb-1.5">Rating Bintang</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <FiStar
                        size={22}
                        className={
                          star <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-200'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-ink-700 ml-2">{formData.rating} dari 5</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Isi Ulasan & Komentar</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ceritakan pengalaman kepuasan klien terhadap photobooth Memoribox..."
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-ink-900 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-ink-700 bg-white hover:bg-bg border border-line rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Ulasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
          <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-ink-900 font-heading">Hapus Ulasan Ini?</h4>
              <p className="text-xs text-ink-500 mt-1 font-medium">
                Ulasan dari &ldquo;{reviewToDelete.client_name}&rdquo; akan dihapus permanen dari website.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
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

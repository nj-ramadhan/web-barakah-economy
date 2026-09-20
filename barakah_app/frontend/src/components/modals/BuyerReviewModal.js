// components/modals/BuyerReviewModal.js
import React, { useState, useEffect } from 'react';
import { addTestimoniBuyer, getMyTestimoni } from '../../services/productApi';
import { compressImage } from '../../utils/imageCompressor';
import { getMediaUrl } from '../../utils/mediaUtils';

const BuyerReviewModal = ({ isOpen, onClose, product, orderNumber, onSuccess }) => {
  const [stars, setStars] = useState(5);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState(null);

  // Edit restriction states
  const [existingReview, setExistingReview] = useState(null);
  const [canEdit, setCanEdit] = useState(true);

  useEffect(() => {
    if (!isOpen || !product) {
      setExistingReview(null);
      setCanEdit(true);
      setError(null);
      return;
    }

    // Prefill from product.user_review if available right away
    if (product.user_review) {
      setExistingReview(product.user_review);
      setStars(product.user_review.stars || 5);
      setDescription(product.user_review.description || '');
      if (product.user_review.image) {
        setImagePreview(getMediaUrl(product.user_review.image));
      }
      setCanEdit(Boolean(product.user_review.can_edit));
    }

    // Fetch freshest review details from backend API
    const fetchLatestReview = async () => {
      try {
        setLoadingReview(true);
        const res = await getMyTestimoni(product.id || product.slug);
        if (res.data?.has_review && res.data.review) {
          const rev = res.data.review;
          setExistingReview(rev);
          setStars(rev.stars || 5);
          setDescription(rev.description || '');
          if (rev.image) {
            setImagePreview(getMediaUrl(rev.image));
          }
          setCanEdit(Boolean(rev.can_edit));
        } else if (!product.user_review) {
          setExistingReview(null);
          setStars(5);
          setDescription('');
          setImagePreview(null);
          setCanEdit(true);
        }
      } catch (err) {
        // Fallback silently if unauthenticated or error
      } finally {
        setLoadingReview(false);
      }
    };

    fetchLatestReview();
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Automatic compression for files > 5MB to ensure lightweight database/storage
    const compressed = await compressImage(file, 5, 1200);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      setError('Ulasan ini telah mencapai batas maksimal 1x edit dan tidak dapat diubah lagi.');
      return;
    }

    if (!description.trim()) {
      setError('Ulasan atau testimoni tidak boleh kosong.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('stars', stars);
      formData.append('description', description.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await addTestimoniBuyer(product.id || product.slug, formData);
      alert(existingReview ? 'Ulasan Anda berhasil diperbarui.' : 'Terima kasih! Testimoni & ulasan Anda berhasil dikirim.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting buyer review:', err);
      setError(err.response?.data?.error || 'Gagal mengirim ulasan.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyReviewed = Boolean(existingReview);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="material-icons text-amber-500">{isAlreadyReviewed ? 'rate_review' : 'star'}</span>
              {isAlreadyReviewed ? 'Ulasan Produk Saya' : 'Beri Ulasan Produk'}
            </h3>
            {orderNumber && <p className="text-[11px] text-gray-400">Pesanan: {orderNumber}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Product Card summary */}
        <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <img
            src={getMediaUrl(product.thumbnail || product.product_thumbnail) || '/placeholder-image.jpg'}
            alt={product.title || product.product_title}
            className="w-12 h-12 object-cover rounded-xl border border-gray-200 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-gray-900 truncate">
              {product.title || product.product_title}
            </h4>
            <p className="text-[11px] text-emerald-700 font-semibold">Transaksi Selesai</p>
          </div>
        </div>

        {loadingReview ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <>
            {/* Status Edit Notice Banner */}
            {isAlreadyReviewed && (
              <div className="mt-3.5">
                {canEdit ? (
                  existingReview.can_edit_by_admin ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-900 flex items-start gap-2">
                      <span className="material-icons text-base text-emerald-600 shrink-0 mt-0.5">lock_open</span>
                      <div>
                        <span className="font-black block">Akses Edit Dibuka oleh Admin</span>
                        <span className="text-[11px] font-normal text-emerald-800">
                          Admin telah membuka akses untuk Anda. Anda dapat memperbarui bintang dan ulasan di bawah ini (Maksimal 1x edit).
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-semibold text-blue-900 flex items-start gap-2">
                      <span className="material-icons text-base text-blue-600 shrink-0 mt-0.5">edit</span>
                      <div>
                        <span className="font-black block">Kesempatan Edit Tersisa: 1x</span>
                        <span className="text-[11px] font-normal text-blue-800">
                          Anda dapat mengubah ulasan ini maksimal 1 kali. Setelah disimpan, ulasan akan terkunci permanen kecuali dibuka kembali oleh Admin.
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-950 flex items-start gap-2">
                    <span className="material-icons text-base text-amber-600 shrink-0 mt-0.5">lock</span>
                    <div>
                      <span className="font-black block">Ulasan Terkunci (Batas 1x Edit Tercapai)</span>
                      <span className="text-[11px] font-normal text-amber-900">
                        Ulasan ini telah pernah diedit maksimal 1x dan saat ini hanya dapat dilihat. Jika Anda membutuhkan perubahan lebih lanjut, silakan hubungi Administrator untuk mereset izin edit ulasan Anda.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 flex items-center gap-2">
                <span className="material-icons text-sm">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="text-center py-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {canEdit ? 'Bagaimana kualitas produk ini?' : 'Penilaian Bintang Anda'}
                </label>
                <div className={`flex items-center justify-center gap-1 ${!canEdit ? 'pointer-events-none opacity-90' : ''}`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setStars(star)}
                      className="p-1 text-amber-400 hover:scale-125 transition-transform focus:outline-none disabled:cursor-default"
                    >
                      <span className="material-icons text-4xl">
                        {star <= stars ? 'star' : 'star_border'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-gray-700 mt-1">
                  {stars === 5 ? 'Sangat Puas ⭐⭐⭐⭐⭐' : stars === 4 ? 'Puas ⭐⭐⭐⭐' : stars === 3 ? 'Cukup ⭐⭐⭐' : stars === 2 ? 'Kurang Puas ⭐⭐' : 'Kecewa ⭐'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {canEdit ? 'Tulis Testimoni / Pengalaman Anda *' : 'Isi Ulasan Anda'}
                </label>
                <textarea
                  rows="4"
                  placeholder="Ceritakan kepuasan Anda mengenai produk, kemasan, atau pelayanan seller..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  readOnly={!canEdit}
                  className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none ${
                    !canEdit ? 'bg-gray-100/70 text-gray-700 cursor-not-allowed select-text' : ''
                  }`}
                  required
                ></textarea>
              </div>

              {canEdit ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Foto Produk (Opsional)</span>
                    <span className="text-[10px] text-gray-400 font-normal">Auto-kompresi ringan</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              ) : null}

              {imagePreview && (
                <div>
                  {!canEdit && <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Foto Lampiran Ulasan:</p>}
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200">
                    <img src={imagePreview} alt="Review Preview" className="w-full h-full object-cover" />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  {canEdit ? (isAlreadyReviewed ? 'Batal' : 'Nanti Saja') : 'Tutup'}
                </button>

                {canEdit ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-sm">{isAlreadyReviewed ? 'save' : 'send'}</span>
                        <span>{isAlreadyReviewed ? 'Simpan Perubahan Ulasan' : 'Kirim Ulasan'}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold select-none">
                    <span className="material-icons text-xs">lock</span>
                    <span>Ulasan Terkunci</span>
                  </div>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BuyerReviewModal;

// components/modals/BuyerReviewModal.js
import React, { useState } from 'react';
import { addTestimoniBuyer } from '../../services/productApi';
import { compressImage } from '../../utils/imageCompressor';
import { getMediaUrl } from '../../utils/mediaUtils';

const BuyerReviewModal = ({ isOpen, onClose, product, orderNumber, onSuccess }) => {
  const [stars, setStars] = useState(5);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
      alert('Terima kasih! Testimoni & ulasan Anda berhasil dikirim.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting buyer review:', err);
      setError(err.response?.data?.error || 'Gagal mengirim ulasan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="material-icons text-amber-500">star</span>
              Beri Ulasan Produk
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

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 flex items-center gap-2">
            <span className="material-icons text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-center py-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Bagaimana kualitas produk ini?
            </label>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform focus:outline-none"
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
              Tulis Testimoni / Pengalaman Anda *
            </label>
            <textarea
              rows="4"
              placeholder="Ceritakan kepuasan Anda mengenai produk, kemasan, atau pelayanan seller..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            ></textarea>
          </div>

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

          {imagePreview && (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
              <img src={imagePreview} alt="Review Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Nanti Saja
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <span className="material-icons text-sm">send</span>
                  <span>Kirim Ulasan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BuyerReviewModal;

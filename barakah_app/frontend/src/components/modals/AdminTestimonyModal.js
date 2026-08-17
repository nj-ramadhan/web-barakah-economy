// components/modals/AdminTestimonyModal.js
import React, { useState } from 'react';
import { addTestimoniAdmin } from '../../services/productApi';
import { compressImage } from '../../utils/imageCompressor';

const AdminTestimonyModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [customer, setCustomer] = useState('');
  const [stars, setStars] = useState(5);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !product) return null;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress client-side if large
    const compressed = await compressImage(file, 5, 1200);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Teks testimoni / ulasan wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('customer', customer.trim() || 'Pelanggan Terverifikasi');
      formData.append('stars', stars);
      formData.append('description', description);
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (createdDate) {
        // Set to noon UTC to avoid timezone drift
        formData.append('created_at', `${createdDate}T12:00:00Z`);
      }

      await addTestimoniAdmin(product.id || product.slug, formData);
      alert('Testimoni berhasil ditambahkan!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding admin testimony:', err);
      const msg = err.response?.data?.error || 'Gagal menambahkan testimoni.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="material-icons text-emerald-600">rate_review</span>
              Tambah Testimoni Produk
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{product.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 flex items-center gap-2">
            <span className="material-icons text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nama Pembeli / Pelanggan
            </label>
            <input
              type="text"
              placeholder="Contoh: Bpk. Ahmad Hidayat / Ibu Siti"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Rating Bintang ({stars}/5)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                >
                  <span className="material-icons text-3xl">
                    {star <= stars ? 'star' : 'star_border'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Ulasan / Isi Testimoni *
            </label>
            <textarea
              rows="4"
              placeholder="Tulis ulasan produk, misal: Barang sangat bagus, kemasan rapi, pengiriman cepat dan sesuai deskripsi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tanggal Ulasan
              </label>
              <input
                type="date"
                value={createdDate}
                onChange={(e) => setCreatedDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Foto Ulasan (Opsional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
          </div>

          {imagePreview && (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 mt-2">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
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
              Batal
            </button>
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
                  <span className="material-icons text-sm">check_circle</span>
                  <span>Simpan Testimoni</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminTestimonyModal;

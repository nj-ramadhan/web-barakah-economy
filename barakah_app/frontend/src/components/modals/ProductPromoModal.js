// components/modals/ProductPromoModal.js
import React, { useState, useEffect } from 'react';
import { setProductPromotion, deleteProductPromotion, getProductPromotion } from '../../services/productApi';
import { formatCurrency, parseCurrency } from '../../utils/formatters';

const ProductPromoModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [title, setTitle] = useState('Promo Spesial Barakah');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'nominal' | 'min_qty_discount'
  const [discountValue, setDiscountValue] = useState(10);
  const [minQuantity, setMinQuantity] = useState(1);
  const [isMinQtyPercentage, setIsMinQtyPercentage] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePromo, setActivePromo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && product) {
      // Default start date = today, end date = +7 days
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      setStartDate(now.toISOString().slice(0, 16));
      setEndDate(nextWeek.toISOString().slice(0, 16));
      fetchExistingPromo();
    }
  }, [isOpen, product]);

  const fetchExistingPromo = async () => {
    try {
      setLoading(true);
      const res = await getProductPromotion(product.id || product.slug);
      const promos = res.data;
      if (promos && promos.length > 0) {
        const p = promos[0];
        setActivePromo(p);
        setTitle(p.title || 'Promo Spesial');
        setDiscountType(p.discount_type || 'percentage');
        setDiscountValue(p.discount_value || 0);
        setMinQuantity(p.min_quantity || 1);
        setIsMinQtyPercentage(p.is_min_qty_percentage ?? true);
        if (p.start_date) setStartDate(new Date(p.start_date).toISOString().slice(0, 16));
        if (p.end_date) setEndDate(new Date(p.end_date).toISOString().slice(0, 16));
      } else {
        setActivePromo(null);
      }
    } catch (err) {
      console.error('Failed fetching promo:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Nama promo wajib diisi.');
      return;
    }
    if (Number(discountValue) <= 0) {
      setError('Nilai diskon harus lebih dari 0.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('Tanggal berakhir harus setelah tanggal mulai.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await setProductPromotion(product.id || product.slug, {
        title,
        discount_type: discountType,
        discount_value: parseCurrency(discountValue),
        min_quantity: Number(minQuantity) || 1,
        is_min_qty_percentage: isMinQtyPercentage,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      });

      alert('Kampanye promo berhasil disimpan!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving promo:', err);
      setError(err.response?.data?.error || 'Gagal menyimpan kampanye promo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromo = async () => {
    if (!window.confirm('Hapus / Nonaktifkan promo aktif untuk produk ini?')) return;
    try {
      setSubmitting(true);
      await deleteProductPromotion(product.id || product.slug);
      alert('Promo berhasil dinonaktifkan.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert('Gagal menghapus promo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Price calculation
  const originalPrice = Number(product.price || 0);
  let promoPricePreview = originalPrice;
  if (discountType === 'percentage') {
    promoPricePreview = originalPrice - (originalPrice * (Number(discountValue) / 100));
  } else if (discountType === 'nominal') {
    promoPricePreview = originalPrice - Number(discountValue);
  } else if (discountType === 'min_qty_discount') {
    if (isMinQtyPercentage) {
      promoPricePreview = originalPrice - (originalPrice * (Number(discountValue) / 100));
    } else {
      promoPricePreview = originalPrice - Number(discountValue);
    }
  }
  promoPricePreview = Math.max(0, promoPricePreview);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="material-icons text-emerald-600">campaign</span>
              Atur Promo & Diskon Produk
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

        {/* Live Harga Coret Preview Banner */}
        <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Preview Harga Produk</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs text-gray-400 line-through font-semibold">
                Rp {formatCurrency(originalPrice)}
              </span>
              <span className="text-base font-black text-emerald-700">
                Rp {formatCurrency(promoPricePreview)}
              </span>
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm">
            {discountType === 'percentage' ? `-${discountValue}%` : `HEMAT Rp ${formatCurrency(discountValue)}`}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nama Promo / Kampanye *
            </label>
            <input
              type="text"
              placeholder="Contoh: Flash Sale Ramadhan, Promo Gajian, dsb."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Tipe Diskon
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                  discountType === 'percentage'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Diskon %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('nominal')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                  discountType === 'nominal'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Potongan Rp
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('min_qty_discount')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                  discountType === 'min_qty_discount'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Beli &gt; X Qty
              </button>
            </div>
          </div>

          {discountType === 'min_qty_discount' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Minimal Beli (Qty)
                </label>
                <input
                  type="number"
                  min="2"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Bentuk Diskon
                </label>
                <select
                  value={isMinQtyPercentage ? 'pct' : 'nom'}
                  onChange={(e) => setIsMinQtyPercentage(e.target.value === 'pct')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="pct">Persentase (%)</option>
                  <option value="nom">Potongan Tetap (Rp)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nilai Diskon ({discountType === 'percentage' || (discountType === 'min_qty_discount' && isMinQtyPercentage) ? '%' : 'Rp'}) *
            </label>
            <input
              type="text"
              placeholder={discountType === 'percentage' ? 'Contoh: 20 (untuk 20%)' : 'Contoh: 15000 (untuk Rp 15.000)'}
              value={discountType === 'percentage' || (discountType === 'min_qty_discount' && isMinQtyPercentage) ? discountValue : formatCurrency(discountValue)}
              onChange={(e) => {
                if (discountType === 'percentage' || (discountType === 'min_qty_discount' && isMinQtyPercentage)) {
                  setDiscountValue(e.target.value.replace(/[^0-9.]/g, ''));
                } else {
                  setDiscountValue(parseCurrency(e.target.value));
                }
              }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tanggal Mulai *
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tanggal Berakhir *
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {activePromo ? (
              <button
                type="button"
                onClick={handleDeletePromo}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                Hapus / Hentikan Promo
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Terapkan Promo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductPromoModal;

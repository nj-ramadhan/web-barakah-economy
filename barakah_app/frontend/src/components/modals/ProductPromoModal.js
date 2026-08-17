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
        setDiscountValue(parseCurrency(p.discount_value) || 0);
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

  const originalPrice = Number(product.price || 0);
  const isPercentage = discountType === 'percentage' || (discountType === 'min_qty_discount' && isMinQtyPercentage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Nama promo wajib diisi.');
      return;
    }
    const numericDiscount = Number(discountValue);
    if (numericDiscount <= 0) {
      setError('Nilai diskon harus lebih dari 0.');
      return;
    }
    if (isPercentage && numericDiscount > 100) {
      setError('Diskon persentase maksimal 100%.');
      return;
    }
    if (!isPercentage && originalPrice > 0 && numericDiscount > originalPrice) {
      setError(`Diskon nominal tidak boleh melebihi harga jual produk (Rp ${formatCurrency(originalPrice)}).`);
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
  let promoPricePreview = originalPrice;
  if (isPercentage) {
    const cappedPct = Math.min(100, Math.max(0, Number(discountValue) || 0));
    promoPricePreview = originalPrice - (originalPrice * (cappedPct / 100));
  } else {
    const cappedNom = Math.min(originalPrice, Math.max(0, Number(discountValue) || 0));
    promoPricePreview = originalPrice - cappedNom;
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
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-semibold flex items-center gap-2">
            <span className="material-icons text-sm">error_outline</span>
            {error}
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="mt-4 p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl text-white shadow-lg shadow-emerald-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Harga Promo Pembeli</p>
            <p className="text-xl font-black mt-0.5">Rp {formatCurrency(promoPricePreview)}</p>
            <p className="text-xs text-emerald-100 line-through">Rp {formatCurrency(originalPrice)}</p>
          </div>
          <div className="text-right">
            <span className="bg-white/20 backdrop-blur-sm text-white font-black text-xs px-3 py-1 rounded-full border border-white/30">
              {isPercentage 
                ? `HEMAT ${Math.min(100, Math.round(Number(discountValue) || 0))}%`
                : `HEMAT Rp ${formatCurrency(Math.min(originalPrice, Number(discountValue) || 0))}`
              }
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nama / Judul Kampanye Promo *
            </label>
            <input
              type="text"
              placeholder="Misal: Flash Sale Kemerdekaan, Promo Berkah Ramadhan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Tipe Diskon *
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Nilai Diskon ({isPercentage ? '%' : 'Rp'}) *
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {isPercentage ? 'Maksimal 100%' : `Maksimal Rp ${formatCurrency(originalPrice)}`}
              </span>
            </div>
            <input
              type="text"
              placeholder={isPercentage ? 'Maksimal 100 (contoh: 20)' : `Maksimal ${originalPrice} (contoh: 15000)`}
              value={isPercentage ? discountValue : formatCurrency(discountValue)}
              onChange={(e) => {
                if (isPercentage) {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  if (Number(val) > 100) {
                    setDiscountValue(100);
                  } else {
                    setDiscountValue(val);
                  }
                } else {
                  const parsed = parseCurrency(e.target.value);
                  if (originalPrice > 0 && parsed > originalPrice) {
                    setDiscountValue(originalPrice);
                  } else {
                    setDiscountValue(parsed);
                  }
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

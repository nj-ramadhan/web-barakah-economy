// components/modals/UnreviewedOrdersModal.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnreviewedProducts } from '../../services/productApi';
import { getMediaUrl } from '../../utils/mediaUtils';
import BuyerReviewModal from './BuyerReviewModal';

const UnreviewedOrdersModal = () => {
  const [unreviewedItems, setUnreviewedItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.access) return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('unreviewed_modal_dismissed');
    if (isDismissed) return;

    const checkUnreviewed = async () => {
      try {
        const res = await getUnreviewedProducts();
        const items = res.data;
        if (items && items.length > 0) {
          setUnreviewedItems(items);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Error checking unreviewed products:', err);
      }
    };

    // Small delay on mount
    const timer = setTimeout(checkUnreviewed, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('unreviewed_modal_dismissed', 'true');
    setIsOpen(false);
  };

  const handleOpenReview = (item) => {
    setSelectedProduct({
      id: item.product_id,
      slug: item.product_slug,
      title: item.product_title,
      thumbnail: item.product_thumbnail,
      orderNumber: item.order_number
    });
    setIsReviewModalOpen(true);
  };

  const handleReviewSuccess = () => {
    // Remove reviewed item from list
    const updated = unreviewedItems.filter(i => i.product_id !== selectedProduct?.id);
    setUnreviewedItems(updated);
    if (updated.length === 0) {
      handleDismiss();
    }
  };

  if (!isOpen || unreviewedItems.length === 0) {
    return isReviewModalOpen ? (
      <BuyerReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        product={selectedProduct}
        orderNumber={selectedProduct?.orderNumber}
        onSuccess={handleReviewSuccess}
      />
    ) : null;
  }

  const primaryItem = unreviewedItems[0];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <span className="material-icons text-3xl animate-bounce">rate_review</span>
          </div>

          <h3 className="text-base font-bold text-gray-900 mb-1">
            Bagikan Pengalaman Belanja Anda!
          </h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Pesanan Anda telah selesai. Ulasan Anda sangat berharga untuk membantu pembeli lain dan mendukung UMKM Barakah.
          </p>

          {/* Product thumbnail preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-4 text-left">
            <img
              src={getMediaUrl(primaryItem.product_thumbnail) || '/placeholder-image.jpg'}
              alt={primaryItem.product_title}
              className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs text-gray-800 truncate">{primaryItem.product_title}</h4>
              <p className="text-[10px] text-gray-400">No. Pesanan: {primaryItem.order_number}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleOpenReview(primaryItem)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 transition flex items-center justify-center gap-2"
            >
              <span className="material-icons text-base">star</span>
              Tulis Testimoni Sekarang
            </button>
            <button
              onClick={() => {
                handleDismiss();
                navigate('/riwayat-belanja');
              }}
              className="w-full py-2 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Lihat Semua Riwayat Belanja ({unreviewedItems.length})
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>

      {isReviewModalOpen && (
        <BuyerReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          product={selectedProduct}
          orderNumber={selectedProduct?.orderNumber}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
};

export default UnreviewedOrdersModal;

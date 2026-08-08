import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CartToastNotification = () => {
    const navigate = useNavigate();
    const [toast, setToast] = useState({ visible: false, title: '' });

    useEffect(() => {
        const handleCartUpdate = (event) => {
            if (event.detail && event.detail.showToast) {
                setToast({
                    visible: true,
                    title: event.detail.title || 'Produk'
                });

                // Auto hide after 5 seconds
                const timer = setTimeout(() => {
                    setToast(prev => ({ ...prev, visible: false }));
                }, 5000);

                return () => clearTimeout(timer);
            }
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, []);

    if (!toast.visible) return null;

    return (
        <div className="fixed top-16 right-4 z-[9999] bg-white rounded-2xl shadow-2xl border border-emerald-100 p-4 flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 max-w-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-icons text-xl">shopping_cart_checkout</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <h4 className="text-xs font-bold text-gray-900">Masuk Keranjang!</h4>
                </div>
                <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">{toast.title}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => {
                        setToast({ visible: false, title: '' });
                        navigate('/keranjang');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm"
                >
                    Lihat Keranjang
                </button>
                <button
                    onClick={() => setToast({ visible: false, title: '' })}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg"
                >
                    <span className="material-icons text-sm">close</span>
                </button>
            </div>
        </div>
    );
};

export default CartToastNotification;

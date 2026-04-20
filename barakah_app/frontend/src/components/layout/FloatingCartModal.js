import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FloatingCartModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('keranjang'); // 'keranjang' | 'incaran'
    const [cartItems, setCartItems] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const navigate = useNavigate();

    const fetchItems = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) return;
        try {
            // Adjust endpoints based on backend setup
            const cartRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, { headers: { Authorization: `Bearer ${user.access}` } });
            setCartItems(cartRes.data);
            const wishRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/wishlists/wishlist/`, { headers: { Authorization: `Bearer ${user.access}` } });
            setWishlistItems(wishRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchItems();
        // Add listener for custom event to trigger animation and refetch
        const handleCartUpdate = () => {
            fetchItems();
            // Trigger animation class
            const bubble = document.getElementById('cart-floating-bubble');
            if (bubble) {
                bubble.classList.add('animate-bounce-subtle');
                setTimeout(() => bubble.classList.remove('animate-bounce-subtle'), 1000);
            }
        };
        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, []);

    const toggleCart = () => setIsOpen(!isOpen);

    const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <>
            {/* The Floating Bubble */}
            <button
                id="cart-floating-bubble"
                onClick={toggleCart}
                className="fixed bottom-32 right-4 w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center z-[1000] hover:scale-105 transition-transform"
            >
                <span className="material-icons text-2xl">shopping_cart</span>
                {totalQty > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        {totalQty}
                    </div>
                )}
            </button>

            {/* The Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[1002] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in transition-opacity">
                    <div className="bg-white w-full sm:w-[400px] h-[85vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-slide-up">
                        {/* Header & Tabs */}
                        <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-lg">Sinergy Cart</h3>
                                <button onClick={toggleCart} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100">
                                    <span className="material-icons text-gray-500">close</span>
                                </button>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('keranjang')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'keranjang' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Keranjang ({cartItems.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('incaran')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'incaran' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Incaran ({wishlistItems.length})
                                </button>
                            </div>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {activeTab === 'keranjang' ? (
                                cartItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <span className="material-icons text-5xl mb-2">shopping_bag</span>
                                        <p className="text-sm">Keranjang kosong</p>
                                    </div>
                                ) : (
                                    cartItems.map(item => (
                                        <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3">
                                            <div className="w-20 h-20 bg-gray-100 rounded-xl"></div>
                                            <div className="flex-1 flex flex-col">
                                                <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{item.product?.title}</h4>
                                                {item.variation && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full w-fit mt-1">{item.variation.name}</span>}
                                                <div className="mt-auto flex justify-between items-end">
                                                    <span className="font-bold text-green-700 text-sm">Rp {item.total_price}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                                        <button className="material-icons text-red-400 text-sm hover:bg-red-50 rounded p-1">delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                wishlistItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <span className="material-icons text-5xl mb-2">favorite_border</span>
                                        <p className="text-sm">Belum ada barang incaran</p>
                                    </div>
                                ) : (
                                     <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <p className="text-sm">Item incaran belum dimuat</p>
                                     </div>
                                )
                            )}
                        </div>

                        {/* Bottom Actions */}
                        {activeTab === 'keranjang' && cartItems.length > 0 && (
                            <div className="p-4 bg-white border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/sinergy/checkout');
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-200 hover:shadow-xl transition-all"
                                >
                                    Checkout Sekarang
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingCartModal;

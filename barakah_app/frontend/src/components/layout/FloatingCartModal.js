import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const isAllowedPage = (pathname) => {
    // Exact home
    if (pathname === '/') return true;
    
    // E-commerce paths
    if (
        pathname.startsWith('/sinergy') ||
        pathname.startsWith('/produk/') ||
        pathname === '/incaran' ||
        pathname === '/keranjang' ||
        pathname === '/riwayat-belanja' ||
        pathname === '/bayar-belanja' ||
        pathname === '/konfirmasi-pembayaran-belanja'
    ) return true;

    // Digital products paths
    if (
        pathname.startsWith('/digital-products') ||
        pathname.startsWith('/digital-produk/') ||
        pathname.startsWith('/digital_produk/')
    ) return true;

    // Predefined non-store paths to exclude
    const predefinedNonStorePaths = [
        '/login', '/register', '/lupa-password', '/reset-password',
        '/profile', '/charity', '/kampanye', '/bayar-donasi', '/riwayat-donasi',
        '/konfirmasi-pembayaran-donasi', '/articles', '/academy', '/kelas',
        '/ikut-kelas', '/konfirmasi-pembayaran-kelas', '/pembayaran-berhasil',
        '/pembayaran-gagal', '/pembayaran-tertunda', '/about', '/hubungi-kami',
        '/streaming', '/kegiatan', '/meetings', '/event', '/events', '/chat',
        '/forum', '/dashboard', '/live-meet-test', '/widget', '/bae-run'
    ];

    const isPredefinedNonStore = predefinedNonStorePaths.some(p => 
        pathname === p || pathname.startsWith(p + '/')
    );

    // If it's not a predefined non-store path, check if it's a single-level username path (e.g. /johndoe)
    if (!isPredefinedNonStore) {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length === 1) {
            return true; // Seller profile page (/:username)
        }
        if (parts.length === 2 && (parts[0] === 'digital-produk' || parts[0] === 'digital_produk')) {
            return true; // digital product product page
        }
    }

    return false;
};

const FloatingCartModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('keranjang'); // 'keranjang' | 'incaran'
    const [cartItems, setCartItems] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    // Custom Drag States & Refs
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(true);
    const bubbleRef = useRef(null);
    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        startOffsetX: 0,
        startOffsetY: 0,
        hasMoved: false,
        initialRect: null
    });

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

    const handleUpdateQty = async (cartItemId, newQty) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) return;
        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                cart_item_id: cartItemId,
                quantity: newQty
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCart = async (cartItemId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                data: { cart_item_id: cartItemId },
                headers: { Authorization: `Bearer ${user.access}` }
            });
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteWishlist = async (wishlistItemId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/wishlists/wishlist/`, {
                data: { wishlist_item_id: wishlistItemId },
                headers: { Authorization: `Bearer ${user.access}` }
            });
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        // Reset coordinate and visibility when navigating to another page
        setIsVisible(true);
        setPosition({ x: 0, y: 0 });
        if (bubbleRef.current) {
            bubbleRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
        }
    }, [location.pathname]);

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

    const handlePointerDown = (e) => {
        if (e.button !== 0 && e.button !== undefined) return;
        const bubble = bubbleRef.current;
        if (!bubble) return;

        const rect = bubble.getBoundingClientRect();
        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startOffsetX: position.x,
            startOffsetY: position.y,
            hasMoved: false,
            initialRect: {
                left: rect.left - position.x,
                top: rect.top - position.y,
                width: rect.width,
                height: rect.height
            }
        };

        try {
            bubble.setPointerCapture(e.pointerId);
        } catch (err) {
            console.error(err);
        }
        bubble.style.transition = 'none';
    };

    const handlePointerMove = (e) => {
        if (!dragRef.current.isDragging) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragRef.current.hasMoved = true;
        }

        const newX = dragRef.current.startOffsetX + dx;
        const newY = dragRef.current.startOffsetY + dy;

        let clampedX = newX;
        let clampedY = newY;

        if (dragRef.current.initialRect) {
            const { left, top, width, height } = dragRef.current.initialRect;
            const minX = -left;
            const maxX = window.innerWidth - width - left;
            const minY = -top;
            const maxY = window.innerHeight - height - top;
            clampedX = Math.max(minX, Math.min(maxX, newX));
            clampedY = Math.max(minY, Math.min(maxY, newY));
        }

        const bubble = bubbleRef.current;
        if (bubble) {
            bubble.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
        }
    };

    const handlePointerUp = (e) => {
        if (!dragRef.current.isDragging) return;
        dragRef.current.isDragging = false;

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {
            console.error(err);
        }

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = dragRef.current.startOffsetX + dx;
        const newY = dragRef.current.startOffsetY + dy;

        let clampedX = newX;
        let clampedY = newY;

        if (dragRef.current.initialRect) {
            const { left, top, width, height } = dragRef.current.initialRect;
            const minX = -left;
            const maxX = window.innerWidth - width - left;
            const minY = -top;
            const maxY = window.innerHeight - height - top;
            clampedX = Math.max(minX, Math.min(maxX, newX));
            clampedY = Math.max(minY, Math.min(maxY, newY));
        }

        setPosition({ x: clampedX, y: clampedY });

        const bubble = bubbleRef.current;
        if (bubble) {
            bubble.style.transition = 'transform 0.15s ease-out';
            bubble.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
        }

        if (!dragRef.current.hasMoved) {
            toggleCart();
        }
    };

    const handleDismiss = (e) => {
        e.stopPropagation();
        setIsVisible(false);
    };

    if (!isVisible || !isAllowedPage(location.pathname)) {
        return null;
    }

    return (
        <>
            {/* The Floating Bubble */}
            <div
                ref={bubbleRef}
                id="cart-floating-bubble"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                    touchAction: 'none'
                }}
                className="fixed bottom-32 right-4 w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center z-[1000] cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
            >
                {/* Close Button */}
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={handleDismiss}
                    className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full flex items-center justify-center border border-gray-200 shadow-md z-[1001] transition-all hover:scale-110 active:scale-90"
                    title="Hilangkan keranjang"
                >
                    <span className="material-icons text-[14px] font-bold">close</span>
                </button>

                <span className="material-icons text-2xl pointer-events-none">shopping_cart</span>
                {totalQty > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse pointer-events-none">
                        {totalQty}
                    </div>
                )}
            </div>

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
                                            {item.product?.thumbnail ? (
                                                <img src={item.product.thumbnail} alt={item.product?.title} className="w-20 h-20 bg-gray-100 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-100 rounded-xl"></div>
                                            )}
                                            <div className="flex-1 flex flex-col">
                                                <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{item.product?.title}</h4>
                                                {item.variation && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full w-fit mt-1">{item.variation.name}</span>}
                                                <div className="mt-auto flex justify-between items-end">
                                                    <span className="font-bold text-green-700 text-sm">Rp {item.total_price}</span>
                                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                                                        <button 
                                                            onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-500 transition"
                                                        >
                                                            <span className="material-icons text-sm">{item.quantity > 1 ? 'remove' : 'delete'}</span>
                                                        </button>
                                                        <span className="text-xs font-bold text-gray-700 w-4 text-center">{item.quantity}</span>
                                                        <button 
                                                            onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-green-600 transition"
                                                        >
                                                            <span className="material-icons text-sm">add</span>
                                                        </button>
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
                                    wishlistItems.map(item => (
                                        <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3">
                                            {item.product?.thumbnail ? (
                                                <img src={item.product.thumbnail} alt={item.product?.title} className="w-20 h-20 bg-gray-100 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-100 rounded-xl"></div>
                                            )}
                                            <div className="flex-1 flex flex-col">
                                                <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{item.product?.title}</h4>
                                                <div className="mt-auto flex justify-between items-end">
                                                    <span className="font-bold text-green-700 text-sm">Rp {item.product?.price}</span>
                                                    <button onClick={() => handleDeleteWishlist(item.id)} className="material-icons text-red-400 text-sm hover:bg-red-50 rounded p-1">favorite</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>

                        {/* Bottom Actions */}
                        {activeTab === 'keranjang' && cartItems.length > 0 && (
                            <div className="p-4 bg-white border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/bayar-belanja', { state: { cartItems: cartItems } });
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

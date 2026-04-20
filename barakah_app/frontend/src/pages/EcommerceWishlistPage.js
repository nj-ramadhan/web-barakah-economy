// pages/EcommerceWishlistPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return null;
  }

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(amount);
  };

const EcommerceWishlistPage = () => {
    const navigate = useNavigate();
    const [wishlistItems, setWishlistItems] = useState([]);

    // Define fetchWishlistItems with useCallback so its reference is stable
    const fetchWishlistItems = React.useCallback(async () => {
        const csrfToken = getCsrfToken();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                console.error('User not logged in or token missing');
                navigate('/login');
                return;
            }
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/wishlists/wishlist/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,
                    'X-CSRFToken': csrfToken,
                },
            });
            setWishlistItems(response.data);
        } catch (error) {
            console.error('Error fetching wishlist items:', error);
    
            // Handle specific error cases
            if (error.response) {
                console.error('Error response:', error.response);
    
                // Handle 403 Forbidden (token invalid or expired)
                if (error.response.status === 403) {
                    console.error('Token expired or invalid. Redirecting to login...');
                    localStorage.removeItem('user');  // Clear the invalid token
                    navigate('/login');  // Redirect to login page
                }
            }
        }
    }, [navigate]);

    useEffect(() => {
        fetchWishlistItems();
    }, [fetchWishlistItems]);

    const removeFromWishlist = async (productId) => {
        const csrfToken = getCsrfToken();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                console.error('User not logged in');
                return;
            }

            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/wishlists/wishlist`, {
                data: { product_id: productId },
                headers: {
                    Authorization: `Bearer ${user.access}`,
                    'X-CSRFToken': csrfToken,
                },
            });
            fetchWishlistItems(); // Refresh wishlist items
        } catch (error) {
            console.error('Error removing item from wishlist:', error);
        }
    };

    const addToCart = async (productId) => {
        const csrfToken = getCsrfToken();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                console.error('User not logged in');
                navigate('/login'); // Redirect to login page if not logged in
                return;
            }

            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                product_id: productId,
                quantity: 1
            }, {
                headers: {
                    Authorization: `Bearer ${user.access}`,
                    'X-CSRFToken': csrfToken,
                }
            });

            alert('Berhasil menambahkan produk ke keranjang!');
        } catch (error) {
            console.error('Error adding product to cart:', error);
            alert('Gagal menambahkan produk ke keranjang');
        }
    };

    return (
        <div className="body">
            <Header />
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Produk Incaran</h1>
                </div>
                <button
                    onClick={() => navigate('/keranjang')}
                    className="w-full block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 flex items-center justify-center"
                >
                    <span className="material-icons text-sm mr-4">shopping_cart</span>LIHAT KERANJANG
                </button>
                {wishlistItems.length === 0 ? (
                    <p className="text-gray-600 mt-4">Produk Incaran kamu kosong.</p>
                ) : (
                    <ul className="space-y-4 mt-4">
                        {wishlistItems.map((item) => (
                            <li key={item.id} className="p-4 border rounded-lg shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="flex justify-left items-center">
                                        <img 
                                            src={item.product.thumbnail || '/images/produk.jpg'} 
                                            alt={item.product.title}
                                            className="w-12 h-12 object-cover mr-4"
                                            onError={(e) => {
                                                e.target.src = '/images/produk.jpg';
                                            }}
                                            />
                                        <div className="justify-left">
                                            <h3 className="text-sm font-semibold">{item.product.title}</h3>
                                            <p className="text-gray-600 text-xs">stok{' '} {item.product.stock > 0 ? item.product.stock : 'habis'}</p>
                                            <p className="text-gray-600 text-xs">{formatIDR(item.product.price)} / {item.product.unit}</p>
                                        </div>    
                                    </span>
                                        {item.product.stock <= 0 ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <button
                                                className="bg-gray-100 text-gray-400 p-2.5 rounded-xl cursor-not-allowed"
                                                disabled
                                            >
                                                <span className="material-icons text-lg">remove_shopping_cart</span>
                                            </button>
                                            <button
                                                onClick={() => removeFromWishlist(item.product.id)}
                                                className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-100 transition"
                                                title="Hapus"
                                            >
                                                <span className="material-icons text-lg">delete</span>
                                            </button>
                                        </div>
                                        ) : (
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => addToCart(item.product.id)}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl flex items-center justify-center transition shadow-lg shadow-green-100"
                                                    title="Keranjang"
                                                >
                                                    <span className="material-icons text-lg">shopping_cart</span>
                                                </button>
                                                <button
                                                    onClick={() => removeFromWishlist(item.product.id)}
                                                    className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-100 transition"
                                                    title="Hapus"
                                                >
                                                    <span className="material-icons text-lg">delete</span>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    addToCart(item.product.id);
                                                    setTimeout(() => {
                                                    const bubble = document.getElementById('cart-floating-bubble');
                                                    if (bubble) bubble.click();
                                                    }, 500);
                                                }}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold shadow-lg shadow-emerald-100"
                                            >
                                                <span className="material-icons text-sm">shopping_bag</span>
                                                Beli
                                            </button>
                                        </div>
                                        )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default EcommerceWishlistPage;
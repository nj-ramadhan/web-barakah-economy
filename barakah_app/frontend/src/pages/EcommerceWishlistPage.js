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
                                        <div className="flex flex-col items-center">
                                            <button
                                                onClick={() => addToCart(item.product.id)}
                                                className="bg-gray-400 material-icons text-sm text-white px-4 py-2 rounded-lg hover:bg-gray-500 mb-2"
                                                disabled
                                            >
                                                add_shopping_cart
                                            </button>
                                            <button
                                                onClick={() => removeFromWishlist(item.product.id)}
                                                className="bg-red-600 material-icons text-sm text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                            >
                                                delete
                                            </button>
                                        </div>
                                        ) : (
                                        <div className="flex flex-col items-center">
                                            <button
                                                onClick={() => addToCart(item.product.id)}
                                                className="bg-green-800 material-icons text-sm text-white px-4 py-2 rounded-lg hover:bg-green-900 mb-2"
                                            >
                                                add_shopping_cart
                                            </button>
                                            <button
                                                onClick={() => removeFromWishlist(item.product.id)}
                                                className="bg-red-600 material-icons text-sm text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                            >
                                                delete
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
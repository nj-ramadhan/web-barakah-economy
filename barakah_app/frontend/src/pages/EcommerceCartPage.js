// pages/EcommerceCartPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
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
  
const EcommerceCartPage = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [quantities, setQuantities] = useState({});

    const fetchCartItems = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                console.error('User not logged in or token missing');
                navigate('/login');
                return;
            }
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,
                },
            });
            setCartItems(response.data);
            const initialQuantities = {};
            response.data.forEach(item => {
                initialQuantities[item.product.id] = item.quantity;
            });
            setQuantities(initialQuantities);
        } catch (error) {
            console.error('Error fetching cart items:', error);
            if (error.response && error.response.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
    }, [navigate]);

    useEffect(() => {
        fetchCartItems();
    }, [fetchCartItems]);

    const removeFromCart = async (productId) => {
        const csrfToken = getCsrfToken();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                console.error('User not logged in');
                return;
            }

            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                data: { product_id: productId },
                headers: {
                    Authorization: `Bearer ${user.access}`,
                    'X-CSRFToken': csrfToken,
                },
            });

            fetchCartItems(); // Refresh cart items
        } catch (error) {
            console.error('Error removing item from cart:', error);
            alert('Gagal menghapus item dari keranjang. Silakan coba lagi.');
        }
    };

    const handleUpdateQty = async (cartItemId, newQty) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) return;

            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                cart_item_id: cartItemId,
                quantity: newQty
            }, {
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            });
            
            fetchCartItems(); // Refresh full cart
            window.dispatchEvent(new Event('cartUpdated')); // Sync floating modal
        } catch (error) {
            console.error('Error updating quantity:', error);
            alert('Gagal update jumlah. Silakan coba lagi.');
        }
    };

    const handleIncrement = (item) => {
        const newQty = (item.quantity || 0) + 1;
        if (newQty > item.product.stock) {
            alert('Stok tidak mencukupi');
            return;
        }
        handleUpdateQty(item.id, newQty);
    };

    const handleDecrement = (item) => {
        const newQty = (item.quantity || 0) - 1;
        handleUpdateQty(item.id, newQty);
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            alert('Keranjang belanja kosong. Tambahkan produk sebelum melanjutkan ke pembayaran.');
            return;
        }
    
        navigate('/bayar-belanja', { state: { cartItems } }); // Pass the updated cartItems
    };

    return (
        <div className="body">
            <Header />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Keranjang Belanja</h1>
                <button
                    onClick={() => navigate('/incaran')}
                    className="w-full block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 flex items-center justify-center"
                >
                    <span className="material-icons text-sm mr-4">favorite</span>LIHAT INCARAN
                </button>                
                {cartItems.length === 0 ? (
                    <p className="text-gray-600 mt-4">Keranjang Belanja kamu kosong</p>
                ) : (
                    <>
                        <ul className="space-y-4 mt-4">
                            {cartItems.map((item) => (
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
                                                {item.variation && <p className="text-[10px] text-green-600 font-bold">Varian: {item.variation.name}</p>}
                                                <p className="text-gray-600 text-xs">stok{' '} {item.product.stock > 0 ? item.product.stock : 'habis'}</p>
                                                <p className="text-gray-600 text-xs">{formatIDR(item.product.price)} / {item.product.unit}</p>
                                                <p className="text-xs text-gray-600">Total {formatIDR(item.total_price)}</p>
                                            </div>    
                                        </span>
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center mb-2">
                                                <button
                                                    onClick={() => handleDecrement(item)}
                                                    className="bg-gray-300 material-icons text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400"
                                                >
                                                    {item.quantity > 1 ? 'remove' : 'delete'}
                                                </button>
                                                <span className="mx-2 font-bold">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleIncrement(item)}
                                                    className="bg-gray-300 material-icons text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400"
                                                    disabled={item.quantity >= item.product.stock}
                                                >
                                                    add
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="text-red-500 text-xs font-bold hover:underline"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={handleCheckout}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium mt-4"
                        >
                            Bayar Sekarang
                        </button>
                    </>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default EcommerceCartPage;
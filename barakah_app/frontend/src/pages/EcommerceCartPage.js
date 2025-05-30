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

    const handleIncrement = (productId, stock) => {
        setQuantities((prevQuantities) => {
            const newQuantity = Math.min(prevQuantities[productId] + 1, stock);
            const updatedQuantities = { ...prevQuantities, [productId]: newQuantity };

            // Update cartItems with the new quantity
            const updatedCartItems = cartItems.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: updatedQuantities[productId] }
                    : item
            );
            setCartItems(updatedCartItems);

            return updatedQuantities;
        });
    };

    const handleDecrement = (productId) => {
        setQuantities((prevQuantities) => {
            const newQuantity = Math.max(prevQuantities[productId] - 1, 0);
            const updatedQuantities = { ...prevQuantities, [productId]: newQuantity };

            // Update cartItems with the new quantity
            const updatedCartItems = cartItems.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: updatedQuantities[productId] }
                    : item
            );
            setCartItems(updatedCartItems);

            // If quantity is zero, confirm removal
            if (newQuantity === 0) {
                const confirmDelete = window.confirm('Quantity is zero. Do you want to remove this item from the cart?');
                if (confirmDelete) {
                    removeFromCart(productId);
                }
            }

            return updatedQuantities;
        });
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
                                                <p className="text-gray-600 text-xs">stok{' '} {item.product.stock > 0 ? item.product.stock : 'habis'}</p>
                                                <p className="text-gray-600 text-xs">{formatIDR(item.product.price)} / {item.product.unit}</p>
                                                <p className="text-xs text-gray-600">Total {formatIDR(item.product.price * quantities[item.product.id])}</p>
                                            </div>    
                                        </span>
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center mb-2">
                                                <button
                                                    onClick={() => handleDecrement(item.product.id)}
                                                    className="bg-gray-300 material-icons text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400"
                                                    disabled={quantities[item.product.id] === 0}
                                                >
                                                    remove
                                                </button>
                                                <span className="mx-2">{quantities[item.product.id]}</span>
                                                <button
                                                    onClick={() => handleIncrement(item.product.id, item.product.stock)}
                                                    className="bg-gray-300 material-icons text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400"
                                                    disabled={quantities[item.product.id] >= item.product.stock}
                                                >
                                                    add
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="bg-red-600 material-icons text-sm text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                            >
                                                delete
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
// pages/EcommerceCartPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import '../styles/Body.css';

const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
const EcommerceCartPage = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [quantities, setQuantities] = useState({});

    useEffect(() => {
        fetchCartItems();
    }, []);

    const fetchCartItems = async () => {
        try {
            // Retrieve the user object from Local Storage
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Check if the user object and access token exist
            if (!user || !user.access) {
                console.error('User not logged in or token missing');
                navigate('/login');  // Redirect to login page
                return;
            }
    
            // Log the token for debugging
            console.log('User token:', user.access);
    
            // Make the API request with the token in the headers
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,  // Use "Bearer" for JWT tokens
                },
                params: {
                    user_id: user.id,  // Pass the user ID as a query parameter
                },
            });
    
            // Log the response for debugging
            console.log('Cart items fetched:', response.data);
    
            // Update the state with the fetched cart items
            setCartItems(response.data);
            // Initialize quantities state
            const initialQuantities = {};
            response.data.forEach(item => {
                initialQuantities[item.product.id] = item.quantity;
            });
            setQuantities(initialQuantities);
        } catch (error) {
            console.error('Error fetching cart items:', error);
    
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
    };

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
        }
    };

    const handleIncrement = (productId, stock) => {
        setQuantities(prevQuantities => {
            const newQuantity = Math.min(prevQuantities[productId] + 1, stock);
            return { ...prevQuantities, [productId]: newQuantity };
        });
    };

    const handleDecrement = (productId) => {
        setQuantities(prevQuantities => {
            const newQuantity = Math.max(prevQuantities[productId] - 1, 0);
            if (newQuantity === 0) {
                const confirmDelete = window.confirm('Quantity is zero. Do you want to remove this item from the cart?');
                if (confirmDelete) {
                    removeFromCart(productId);
                }
            }
            return { ...prevQuantities, [productId]: newQuantity };
        });
    };

    const handleCheckout = () => {
        navigate('/bayar-belanja', { state: { cartItems } });
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
                                                <p className="text-gray-600 text-xs">Rp. {formatIDR(item.product.price)} / {item.product.unit}</p>
                                                <p className="text-xs text-gray-600">Total Rp. {formatIDR(item.product.price * quantities[item.product.id])}</p>
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
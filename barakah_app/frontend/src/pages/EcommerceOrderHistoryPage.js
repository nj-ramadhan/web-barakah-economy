// pages/EcommerceOrderHistoryPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(amount);
  };

const formatDate = (dates) => {
    if (!dates) return 'tidak ada'; // Campaigns with no deadline
    const date = new Date(dates);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
  };

const EcommerceOrderHistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);

    const fetchOrders = useCallback(async () => {
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
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,  // Use "Bearer" for JWT tokens
                },
            });
    
            // Log the response for debugging
            console.log('Order items fetched:', response.data);
    
            // Update the state with the fetched wishlist items
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching order items:', error);
    
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
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="body">
        <Header />
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-lg font-bold">Riwayat Belanja</h1>
            </div>
            <button
                onClick={() => navigate('/belanja')}
                className="w-full block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 flex items-center justify-center"
            >
                <span className="material-icons text-sm mr-4">shopping_cart</span>BELANJA SEKARANG
            </button>
            {orders.length === 0 ? (
                <p className="text-gray-600 mt-4">Kamu belum pernah belanja.</p>
                
            ) : (
                <ul className="space-y-4 mt-4">
                {orders.map((order) => (
                    <li key={order.id} className="p-4 border rounded-lg shadow-sm">
                        <div className="w-full flex justify-left items-center">
                            <span className="w-full flex justify-left items-center">
                                <div className="w-full justify-left">
                                    <span className="w-full flex justify-between items-center text-gray-600 text-xs">
                                        <h3 className="text-sm font-semibold">Order No</h3>
                                        <h3 className="text-sm font-semibold mr-32">{order.order_number}</h3>
                                    </span>
                                    
                                    <span className="w-full flex justify-between items-center text-gray-600 text-xs">
                                        <p>Tanggal</p>
                                        <p className="font-bold mr-32">{formatDate(order.created_at)}</p>
                                    </span>
                                    <span className="w-full flex justify-between items-center text-gray-600 text-xs">
                                        <p>Status</p>
                                        <p className="font-bold mr-32">{order.status}</p>
                                    </span>                                    
                                    <p className="text-gray-600 text-xs">Item Produk</p>
                                    <ul>
                                        {order.items.map((item) => (
                                            <li key={item.id} className="ml-6 text-gray-600 text-xs">
                                                <span className="w-full flex justify-between items-center">
                                                    <div>{item.product_name} x {item.quantity}</div>
                                                    <div>{formatIDR(item.price)}</div>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <span className="w-full flex justify-between items-center text-gray-600 text-xs">
                                        <p>Total</p>
                                        <p className="font-bold">{formatIDR(order.total_price)}</p>
                                    </span>
                                    </div>    
                                </span>
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

export default EcommerceOrderHistoryPage;
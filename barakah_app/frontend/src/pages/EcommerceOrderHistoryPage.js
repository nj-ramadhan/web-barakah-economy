// pages/EcommerceOrderHistoryPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/layout/Header'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import '../styles/Body.css';

const OrderHistoryPage = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await axios.get('/api/orders/');
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    return (
        <div className="body">
            <Header />        
            <div>
                <h1>Order History</h1>
                {orders.length === 0 ? (
                    <p>You have no orders.</p>
                ) : (
                    <ul>
                        {orders.map((order) => (
                            <li key={order.id}>
                                <h3>Order #{order.id}</h3>
                                <p>Status: {order.status}</p>
                                <p>Total: ${order.total_price}</p>
                                <ul>
                                    {order.items.map((item) => (
                                        <li key={item.id}>
                                            {item.product.name} - {item.quantity} x ${item.price}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <NavigationButton />  
        </div>         
    );
};

export default OrderHistoryPage;
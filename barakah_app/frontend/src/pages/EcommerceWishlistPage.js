// pages/EcommerceWishlistPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const WishlistPage = () => {
    const navigate = useNavigate();
    const [wishlistItems, setWishlistItems] = useState([]);

    useEffect(() => {
        fetchWishlistItems();
    }, []);

    const fetchWishlistItems = async () => {
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
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/wishlists/wishlist/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,  // Use "Bearer" for JWT tokens
                },
            });
    
            // Log the response for debugging
            console.log('Wishlist items fetched:', response.data);
    
            // Update the state with the fetched wishlist items
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
    };

    const removeFromWishlist = async (productId) => {
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
                },
            });
            fetchWishlistItems(); // Refresh wishlist items
        } catch (error) {
            console.error('Error removing item from wishlist:', error);
        }
    };

    return (
        <div className="body">
            <Header />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Your Wishlist</h1>
                {wishlistItems.length === 0 ? (
                    <p className="text-gray-600">Your wishlist is empty.</p>
                ) : (
                    <ul className="space-y-4">
                        {wishlistItems.map((item) => (
                            <li key={item.id} className="p-4 border rounded-lg shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="flex justify-left items-center">
                                        <img 
                                            src={item.product.thumbnail || '/images/produk.jpg'} 
                                            alt={item.product.title}
                                            className="w-16 h-16 object-cover mr-4"
                                            onError={(e) => {
                                                e.target.src = '/images/produk.jpg';
                                            }}
                                            />
                                        <div className="justify-left">
                                            <h3 className="text-lg font-semibold">{item.product.title}</h3>
                                            <p className="text-gray-600">Rp. {item.product.price}</p>
                                        </div>    
                                    </span>
                                    <button
                                        onClick={() => removeFromWishlist(item.product.id)}
                                        className="bg-red-500 material-icons text-white px-4 py-2 rounded-lg hover:bg-red-600"
                                    >
                                        delete
                                    </button>
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

export default WishlistPage;
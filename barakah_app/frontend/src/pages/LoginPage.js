import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/Body.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const nextPath = queryParams.get('next') || '/';

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.access) {
                    setIsLoggedIn(true);
                    navigate('/profile', { replace: true });
                }
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await authService.login(username, password);
            let picture = null;
            try {
                const profileData = await authService.getProfile(response.id);
                picture = profileData.picture || null;
            } catch (e) {
                console.error("Failed to fetch profile picture during login", e);
            }
            const userProfile = {
                access: response.access,
                refresh: response.refresh,
                id: response.id,
                username: response.username,
                email: response.email,
                role: response.role,
                picture: picture,
            };
            localStorage.setItem('user', JSON.stringify(userProfile));
            setIsLoggedIn(true);
            alert('Berhasil Login!');
            navigate(nextPath);
        } catch (error) {
            alert('Gagal Login, Isi nama dan password yang benar');
            console.log(error.message);
        }
    };

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const response = await authService.googleLogin(credentialResponse.credential);
            let picture = null;
            try {
                const profileData = await authService.getProfile(response.id);
                picture = profileData.picture || null;
            } catch (e) {
                console.error("Failed to fetch profile picture during google login", e);
            }
            const userProfile = {
                access: response.access,
                refresh: response.refresh,
                id: response.id,
                username: response.username,
                email: response.email,
                role: response.role,
                picture: picture,
            };
            localStorage.setItem('user', JSON.stringify(userProfile));
            setIsLoggedIn(true);
            alert('Berhasil Login dengan akun google!');
            navigate(nextPath);
        } catch (error) {
            alert('Gagal Login dengan akun google, coba cara lain');
            console.log(error.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        alert('Logout successful!');
        navigate('/login');
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.access) {
                    setIsLoggedIn(true);
                    navigate('/profile', { replace: true });
                }
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
    }, [navigate]);

    return (
        <div className="body">
            <Helmet>
                <meta name="description" content="Masuk sebagai anggota, Akses fitur menarik, bermanfaat dan Barakah" />
                <meta property="og:title" content="BARAKAH APP" />
                <meta property="og:description" content="Masuk sebagai anggota, Akses fitur menarik, bermanfaat dan Barakah" />
                <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={window.location.href} />
            </Helmet>

            <Header />
            <div className="container">
                <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                    <div className="p-4">
                        <h3 className="text-lg font-bold mb-4">Silakan Login</h3>
                        <form onSubmit={handleLogin}>
                            <input
                                type="text"
                                placeholder="Nama Pengguna"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2 border rounded-lg mb-4"
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Sandi"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 border rounded-lg mb-4"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-2 text-gray-500"
                                >
                                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                                </button>
                            </div>
                            <div className="mb-4 text-right">
                                <Link to="/lupa-password" className="text-green-600 hover:underline">
                                    Lupa kata sandi?
                                </Link>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center"
                            >
                                Login
                            </button>
                        </form>
                        <div className="mt-4 text-center">
                            <p className="text-gray-600">Belum punya akun? <Link to="/register" className="text-green-600 hover:underline">Daftar disini</Link></p>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-gray-600">Atau login dengan:</p>
                            <div className="flex justify-center mt-2">
                                <GoogleLogin
                                    onSuccess={handleGoogleLogin}
                                    onError={() => {
                                        alert('Google login failed');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default LoginPage;
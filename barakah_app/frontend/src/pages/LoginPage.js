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
    let nextPath = queryParams.get('next');
    if (!nextPath) {
        const savedPath = sessionStorage.getItem('lastAccessedPage');
        const isAuthPath = savedPath && (
            savedPath.startsWith('/login') ||
            savedPath.startsWith('/register') ||
            savedPath.startsWith('/lupa-password') ||
            savedPath.startsWith('/reset-password')
        );
        if (savedPath && !isAuthPath) {
            nextPath = savedPath;
        } else {
            nextPath = '/';
        }
    }

    const [maintenance, setMaintenance] = useState(null);

    useEffect(() => {
        // Check public maintenance status
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/maintenance/`)
            .then(res => {
                if (res.data) setMaintenance(res.data);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.access) {
                    setIsLoggedIn(true);
                    sessionStorage.removeItem('lastAccessedPage');
                    navigate(nextPath, { replace: true });
                }
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
    }, [navigate, nextPath]);

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
                is_verified_member: response.is_verified_member,
                accessible_menus: response.accessible_menus,
                is_profile_complete: response.is_profile_complete,
                user_agreement_accepted: response.user_agreement_accepted,
            };

            const isAdmin = userProfile.username === 'admin' || userProfile.role === 'admin' || (userProfile.accessible_menus && userProfile.accessible_menus.includes('*'));

            if (maintenance?.is_active && !isAdmin) {
                alert('Mohon maaf, saat ini situs sedang dalam mode pemeliharaan (maintenance). Hanya Administrator yang dapat mengakses dashboard saat ini.');
                localStorage.removeItem('user');
                return;
            }

            localStorage.setItem('user', JSON.stringify(userProfile));
            setIsLoggedIn(true);
            alert('Berhasil Login!');
            if (response.is_profile_complete === false) {
                navigate('/profile/edit?complete=1', { replace: true });
            } else {
                sessionStorage.removeItem('lastAccessedPage');
                navigate(nextPath);
            }
        } catch (error) {
            alert('Gagal Login, Isi nama dan password yang benar');
            console.log(error.message);
        }
    };

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            if (!credentialResponse?.credential) {
                alert('Gagal mendapatkan token dari Google. Silakan coba lagi.');
                return;
            }
            const response = await authService.googleLogin(credentialResponse.credential);
            let picture = response.picture || null;
            try {
                const profileData = await authService.getProfile(response.id);
                picture = profileData.picture || picture;
            } catch (e) {
                console.error("Failed to fetch profile picture during Google login", e);
            }
            const userProfile = {
                access: response.access,
                refresh: response.refresh,
                id: response.id,
                username: response.username,
                email: response.email,
                role: response.role,
                picture: picture,
                is_verified_member: response.is_verified_member,
                accessible_menus: response.accessible_menus,
                is_profile_complete: response.is_profile_complete,
                user_agreement_accepted: response.user_agreement_accepted,
            };

            const isAdmin = userProfile.username === 'admin' || userProfile.role === 'admin' || (userProfile.accessible_menus && userProfile.accessible_menus.includes('*'));

            if (maintenance?.is_active && !isAdmin) {
                alert('Mohon maaf, saat ini situs sedang dalam mode pemeliharaan (maintenance). Hanya Administrator yang dapat mengakses dashboard saat ini.');
                localStorage.removeItem('user');
                return;
            }

            localStorage.setItem('user', JSON.stringify(userProfile));
            setIsLoggedIn(true);
            alert('Berhasil Login dengan akun google!');
            if (response.is_profile_complete === false) {
                navigate('/profile/edit?complete=1', { replace: true });
            } else {
                sessionStorage.removeItem('lastAccessedPage');
                navigate(nextPath);
            }
        } catch (error) {
            const errMsg = error?.response?.data?.error || error?.message || 'Gagal Login dengan akun Google';
            alert(`Gagal Login dengan Google: ${errMsg}`);
            console.error('Google login error:', error?.response?.data || error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        alert('Logout successful!');
        navigate('/login');
    };



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
                {/* Maintenance Notice Banner if Active */}
                {maintenance?.is_active && (
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-300 text-amber-900 shadow-sm animate-fade-in">
                        <div className="flex items-start gap-3">
                            <span className="material-icons text-amber-600 text-2xl shrink-0 mt-0.5 animate-pulse">engineering</span>
                            <div>
                                <h4 className="font-black text-sm text-amber-900 mb-0.5">
                                    {maintenance.title || 'Pemberitahuan: Situs Sedang Dalam Pemeliharaan'}
                                </h4>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    {maintenance.message || 'Saat ini website sedang dalam proses perbaikan sistem. Fitur umum dibatasi sementara, dan hanya akun Administrator yang dapat login untuk mengelola sistem.'}
                                </p>
                                {maintenance.estimated_end && (
                                    <p className="text-[11px] font-bold text-emerald-800 mt-2 bg-emerald-100/80 px-2.5 py-1 rounded-lg inline-block border border-emerald-200">
                                        ⏱️ Estimasi Selesai: {new Date(maintenance.estimated_end).toLocaleString('id-ID')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
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
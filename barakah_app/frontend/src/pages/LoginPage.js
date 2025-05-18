import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Body.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        name_full: '',
        gender: '',
        birth_date: '',
        birth_place: '',
        marital_status: '',
        segment: '',
        study_level: '',
        study_campus: '',
        study_faculty: '',
        study_department: '',
        study_program: '',
        study_semester: '',
        study_start_year: '',
        study_finish_year: '',
        address: '',
        job: '',
        work_field: '',
        work_institution: '',
        work_position: '',
        work_salary: '',
        address_latitude: '',
        address_longitude: '',
        address_province: '',
        picture: '', // Profile picture URL
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setIsLoggedIn(true);
            const fetchProfile = async () => {
                try {
                    if (user && user.id) {
                        const profileData = await authService.getProfile(user.id); // Fetch profile data
                        setProfile(profileData);
                    } else {
                        navigate('/login');
                    }
                } catch (error) {
                    console.log('Failed to fetch profile data');
                }
            };
    
            fetchProfile();
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await authService.login(username, password);
            const userProfile = {
                access: response.access,
                refresh: response.refresh,
                id: response.id, // Ensure this is included in the backend response
                username: response.username,
                email: response.email,
            };
            localStorage.setItem('user', JSON.stringify(userProfile));
            setIsLoggedIn(true);
            alert('Berhasil Login!');
            navigate('/');
        } catch (error) {
            alert('Gagal Login, Isi nama dan password yang benar');
            console.log(error.message);
        }
    };

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const response = await authService.googleLogin(credentialResponse.credential);
            const userProfile = {
                access: response.access,
                refresh: response.refresh,
                id: response.id, // Ensure this is included in the backend response
                username: response.username,
                email: response.email,
            };
            localStorage.setItem('user', JSON.stringify(userProfile));
            setIsLoggedIn(true);
            alert('Berhasil Login dengan akun google!');
            navigate('/');
        } catch (error) {
            alert('Gagal Login dengan akun google, coba cara lain');
            console.log(error.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setProfile(null);
        alert('Logout successful!');
        navigate('/login');
    };

    if (isLoggedIn) {
        return (
            <div className="body">
                <Header />
                <div className="container">
                    <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                        <div className="p-4">
                            <div className="flex items-center mb-4">
                                <img
                                    src={profile.picture || `${process.env.REACT_APP_API_BASE_URL}/media/profile_images/pas_foto_standard.png`}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full object-cover mr-4"
                                />
                                <div>
                                    <h3 className="text-sm font-medium mb-2 line-clamp-2">Selamat datang, {profile.name_full}</h3>
                                    <p className="text-xs font-medium mb-2 line-clamp-2">{profile.email}</p>
                                </div>
                            </div>

                            <h3 className="text-sm font-medium mb-2 line-clamp-2 mt-6">Perbaharui Profil Kamu</h3>
                            <div className="flex flex-col space-y-4">
                                <Link
                                    to="/profile"
                                    className="w-full bg-gray-200 hover:bg-green-600 text-green py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">person</span>
                                    Profile
                                </Link>
                            </div>

                            <h3 className="text-sm font-medium mb-2 line-clamp-2 mt-6">Lihat Riwayat Donasi</h3>
                            <div className="flex flex-col space-y-4">
                                <Link
                                    to="/riwayat-donasi" // Cart page
                                    className="w-full bg-gray-200 hover:bg-green-600 text-green py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">volunteer_activism</span>
                                    Riwayat Donasi
                                </Link>
                            </div>

                            <h3 className="text-sm font-medium mb-2 line-clamp-2 mt-6">Lihat Riwayat Belanja</h3>
                            <div className="flex flex-col space-y-4">                                                          
                                <Link
                                    to="/incaran" // Wishlist page
                                    className="w-full bg-gray-200 hover:bg-green-600 text-green py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">favorite</span>
                                    Produk Incaran 
                                </Link>
                                <Link
                                    to="/keranjang" // Cart page
                                    className="w-full bg-gray-200 hover:bg-green-600 text-green py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">shopping_cart</span>
                                    Keranjang Belanja
                                </Link>
                                <Link
                                    to="/riwayat-belanja" // Cart page
                                    className="w-full bg-gray-200 hover:bg-green-600 text-green py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">timer</span>
                                    Riwayat Belanja
                                </Link>
                            </div>

                            <h3 className="text-sm font-medium mb-2 line-clamp-2 mt-6">Reset Password</h3>
                            <div className="flex flex-col space-y-4 mt-6">
                                <Link
                                    to="/reset-password"
                                    className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">lock_reset</span>
                                    Reset Password
                                </Link>
                            </div>

                            <h3 className="text-sm font-medium mb-2 line-clamp-2 mt-6">Log Keluar</h3>
                            <div className="flex flex-col space-y-4">                                  
                                <button
                                    onClick={handleLogout}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm flex items-center justify-left"
                                >
                                    <span className="material-icons text-sm ml-4 mr-2">logout</span>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <NavigationButton />
            </div>
        );
    }

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
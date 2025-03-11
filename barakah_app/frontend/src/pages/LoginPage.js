import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Body.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await authService.login(username, password);
            localStorage.setItem('user', JSON.stringify(response));
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
            localStorage.setItem('user', JSON.stringify(response));
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
                            <h3 className="text-xl font-bold mb-4">Kamu sudah Login</h3>
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium flex items-center justify-center"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                <NavigationButton />
            </div>
        );
    }

    return (
        <div className="body">
            <Header />
            <div className="container">
                <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                    <div className="p-4">
                        <h3 className="text-xl font-bold mb-4">Silakan Login</h3>
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
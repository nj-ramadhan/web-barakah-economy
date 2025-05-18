import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate, Link } from 'react-router-dom'; // For linking to the Login Page
import '../styles/Body.css';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await authService.register(username, email, password);
            alert('Berhasil Mendaftar!');
            navigate('/login');
        } catch (error) {
            alert('Gagal Mendaftar');
            console.log(error.message);
        }
    };

    const handleGoogleRegister = async (credentialResponse) => {
        try {
            const response = await authService.googleLogin(credentialResponse.credential);
            localStorage.setItem('user', JSON.stringify(response)); // Save user data
            alert('Berhasil Mendaftar dengan akun google!');
            navigate('/login');
        } catch (error) {
            alert('Gagal Mendaftar dengan akun google, coba cara lain');
            console.log(error.message);
        }
    };

    return (
        <div className="body">
            <Helmet>
                <meta name="description" content="Mendaftar sebagai anggota, Akses fitur menarik, bermanfaat dan Barakah" />
                <meta property="og:title" content="BARAKAH APP" />
                <meta property="og:description" content="Mendaftar sebagai anggota, Akses fitur menarik, bermanfaat dan Barakah" />
                <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={window.location.href} />
            </Helmet>

            <Header />
            <div className="container">
                <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                    <div className="p-4">
                        <h3 className="text-xl font-bold mb-4">Silakan Mendaftar</h3>
                        <div className="mb-3 mt-4 bg-green-50 p-3 rounded-lg text-sm border border-green-200">
                        <p className="text-green-800">
                            Silahkan mendaftar menjadi anggota Barakah Economy Community untuk mengakses fitur khusus
                        </p>        
                        </div>                              
                        <form onSubmit={handleRegister}>
                            <input
                                type="text"
                                placeholder="Nama Pengguna"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2 border rounded-lg mb-4"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                Daftar
                            </button>
                        </form>
                        <div className="mt-4 text-center">
                            <p className="text-gray-600">
                                Sudah punya akun?{' '}
                                <Link to="/login" className="text-green-600 hover:underline">
                                    Login disini
                                </Link>
                            </p>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-gray-600">Atau Daftar dengan:</p>
                            <div className="flex justify-center mt-2">
                                <GoogleLogin
                                    onSuccess={handleGoogleRegister}
                                    onError={() => {
                                        alert('Google registration failed');
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

export default RegisterPage;
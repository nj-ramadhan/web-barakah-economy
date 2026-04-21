import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Body.css';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [namaLengkap, setNamaLengkap] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = new URLSearchParams(location.search).get('next');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !namaLengkap || !email || !phone || !password) {
            setError('Semua kolom wajib diisi.');
            return;
        }
        if (phone.length < 10) {
            setError('Nomor HP tidak valid (minimal 10 digit).');
            return;
        }
        if (password !== confirmPassword) {
            setError('Konfirmasi kata sandi tidak cocok.');
            return;
        }
        if (password.length < 8) {
            setError('Kata sandi minimal 8 karakter.');
            return;
        }

        setLoading(true);
        try {
            await authService.register(username, email, password, namaLengkap, phone);
            const loginUrl = nextPath ? `/login?next=${nextPath}` : '/login';
            navigate(loginUrl, { state: { registered: true, email } });
        } catch (error) {
            let errorMsg = 'Gagal Mendaftar. Coba lagi.';
            if (error.response?.data) {
                const data = error.response.data;
                errorMsg = Object.keys(data)
                    .map(key => `${key}: ${Array.isArray(data[key]) ? data[key].join(', ') : data[key]}`)
                    .join('. ');
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async (credentialResponse) => {
        try {
            const response = await authService.googleLogin(credentialResponse.credential);
            localStorage.setItem('user', JSON.stringify(response));
            // Jika user baru, arahkan ke profil untuk melengkapi data
            if (response.is_new_user) {
                navigate('/profile/edit?complete=1');
            } else {
                const dest = nextPath || '/dashboard';
                navigate(dest);
            }
        } catch (error) {
            setError('Gagal mendaftar dengan Google. Coba cara lain.');
        }
    };

    const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition";

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Daftar Akun – Barakah Economy Community</title>
                <meta name="description" content="Daftar sebagai anggota Barakah Economy Community. Akses fitur menarik, bermanfaat dan Barakah." />
            </Helmet>

            <Header />
            <div className="max-w-md mx-auto px-4 py-8 pb-24">
                {/* Header Card */}
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-8 text-white text-center mb-6 shadow-xl shadow-green-200">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons text-3xl">person_add</span>
                    </div>
                    <h1 className="text-2xl font-black">Daftar Sekarang</h1>
                    <p className="text-white/80 text-sm mt-2">Bergabung dengan komunitas Barakah Economy</p>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6">
                        {/* Google Register */}
                        <div className="mb-6">
                            <p className="text-xs text-center text-gray-500 font-bold uppercase tracking-widest mb-3">Daftar Cepat dengan Google</p>
                            <div className="flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleRegister}
                                    onError={() => setError('Google registration failed')}
                                    text="signup_with"
                                    shape="rectangular"
                                    theme="outline"
                                    size="large"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">atau isi form</span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Nama Lengkap */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Nama Lengkap <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="reg-nama"
                                    type="text"
                                    placeholder="Nama lengkap sesuai KTP"
                                    value={namaLengkap}
                                    onChange={e => setNamaLengkap(e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="reg-username"
                                    type="text"
                                    placeholder="Tanpa spasi, huruf kecil"
                                    value={username}
                                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="reg-email"
                                    type="email"
                                    placeholder="contoh@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* No HP */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    No. HP / WhatsApp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="reg-phone"
                                    type="tel"
                                    placeholder="08xxxxxxxxxx"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Kata Sandi <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="reg-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Minimal 8 karakter"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        className={`${inputClass} pr-12`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <span className="material-icons text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="reg-confirm-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Ulangi kata sandi"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className={`${inputClass} ${confirmPassword && password !== confirmPassword ? 'border-red-300 ring-2 ring-red-200' : ''}`}
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">Kata sandi tidak cocok</p>
                                )}
                            </div>

                            <button
                                id="reg-submit"
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition disabled:opacity-60 mt-2"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        Mendaftar...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span className="material-icons text-sm">how_to_reg</span>
                                        DAFTAR SEKARANG
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 text-center">
                            <p className="text-sm text-gray-600">
                                Sudah punya akun?{' '}
                                <Link to="/login" className="text-green-600 hover:text-green-700 font-bold">
                                    Login di sini
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default RegisterPage;
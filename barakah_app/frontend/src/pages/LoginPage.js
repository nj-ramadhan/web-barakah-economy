import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import { getInvisibleCaptchaToken } from '../utils/captchaUtils';
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

    // Multi-Device Management State (Max 3 Devices)
    const [deviceKickModalOpen, setDeviceKickModalOpen] = useState(false);
    const [activeDevices, setActiveDevices] = useState([]);
    const [selectedKickDeviceId, setSelectedKickDeviceId] = useState('');
    const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null);
    const [isSubmittingKick, setIsSubmittingKick] = useState(false);

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

    const processLoginSuccess = async (response, isGoogle = false) => {
        let picture = response.picture || null;
        try {
            const profileData = await authService.getProfile(response.id);
            picture = profileData.picture || picture;
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

        if (isGoogle && response.is_new_user) {
            sessionStorage.setItem('just_registered', 'true');
        }

        localStorage.setItem('user', JSON.stringify(userProfile));
        setIsLoggedIn(true);
        alert(isGoogle ? 'Berhasil Login dengan akun Google!' : 'Berhasil Login!');
        sessionStorage.removeItem('lastAccessedPage');
        setDeviceKickModalOpen(false);
        navigate(nextPath);
    };

    const handleLogin = async (e, kickDeviceId = null) => {
        if (e) e.preventDefault();
        try {
            const captchaToken = await getInvisibleCaptchaToken('login-turnstile-container');
            const response = await authService.login(username, password, kickDeviceId, captchaToken);
            await processLoginSuccess(response, false);
        } catch (error) {
            if (error.response && error.response.status === 409 && error.response.data?.requires_device_kick) {
                setActiveDevices(error.response.data.active_devices || []);
                if (error.response.data.active_devices?.length > 0) {
                    setSelectedKickDeviceId(error.response.data.active_devices[0].device_id);
                }
                setDeviceKickModalOpen(true);
                return;
            }
            const errMsg = error.response?.data?.error || error.response?.data?.detail || 'Gagal Login. Silakan periksa kembali nama/email dan password Anda.';
            alert(errMsg);
            console.log(error.message);
        }
    };


    const handleGoogleLogin = async (credentialResponse, kickDeviceId = null) => {
        try {
            const cred = credentialResponse?.credential || pendingGoogleCredential;
            if (!cred) {
                alert('Gagal mendapatkan token dari Google. Silakan coba lagi.');
                return;
            }
            setPendingGoogleCredential(cred);
            const response = await authService.googleLogin(cred, kickDeviceId);
            await processLoginSuccess(response, true);
        } catch (error) {
            if (error.response && error.response.status === 409 && error.response.data?.requires_device_kick) {
                setActiveDevices(error.response.data.active_devices || []);
                if (error.response.data.active_devices?.length > 0) {
                    setSelectedKickDeviceId(error.response.data.active_devices[0].device_id);
                }
                setDeviceKickModalOpen(true);
                return;
            }
            const errMsg = error?.response?.data?.error || error?.message || 'Gagal Login dengan akun Google';
            alert(`Gagal Login dengan Google: ${errMsg}`);
            console.error('Google login error:', error?.response?.data || error);
        }
    };

    const handleConfirmKickDevice = async () => {
        if (!selectedKickDeviceId) {
            alert('Silakan pilih salah satu perangkat untuk di-logout.');
            return;
        }
        setIsSubmittingKick(true);
        try {
            if (pendingGoogleCredential) {
                await handleGoogleLogin({ credential: pendingGoogleCredential }, selectedKickDeviceId);
            } else {
                await handleLogin(null, selectedKickDeviceId);
            }
        } finally {
            setIsSubmittingKick(false);
        }
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

            {/* Modal Pemilihan Logout Perangkat (Max 3 Devices Limit) */}
            {deviceKickModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-in border border-gray-100">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-2xl">devices</span>
                        </div>
                        <h3 className="text-lg font-bold text-center text-gray-900 mb-1">
                            Batas 3 Perangkat Tercapai
                        </h3>
                        <p className="text-xs text-center text-gray-500 mb-5 leading-relaxed">
                            Akun Anda telah terhubung di maksimal 3 perangkat. Silakan pilih salah satu perangkat yang ingin Anda keluarkan (logout) agar perangkat baru ini dapat masuk.
                        </p>

                        <div className="space-y-2.5 max-h-60 overflow-y-auto mb-6 pr-1">
                            {activeDevices.map((dev) => {
                                const isSelected = selectedKickDeviceId === dev.device_id;
                                const isMobile = dev.device_type === 'mobile';
                                const isTablet = dev.device_type === 'tablet';
                                const icon = isMobile ? 'smartphone' : (isTablet ? 'tablet_mac' : 'laptop_mac');

                                return (
                                    <label
                                        key={dev.id || dev.device_id}
                                        onClick={() => setSelectedKickDeviceId(dev.device_id)}
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'border-red-500 bg-red-50/40 shadow-sm' 
                                                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="kick_device"
                                            checked={isSelected}
                                            onChange={() => setSelectedKickDeviceId(dev.device_id)}
                                            className="w-4 h-4 text-red-600 focus:ring-red-500"
                                        />
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                                            <span className="material-icons text-lg">{icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">
                                                {dev.device_name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <span>Aktif: {new Date(dev.last_active).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                {dev.ip_address && <span>• IP {dev.ip_address}</span>}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                                                Akan Dikeluarkan
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeviceKickModalOpen(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={isSubmittingKick || !selectedKickDeviceId}
                                onClick={handleConfirmKickDevice}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-200 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                            >
                                {isSubmittingKick ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-icons text-sm">logout</span>
                                        Keluarkan & Masuk
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default LoginPage;
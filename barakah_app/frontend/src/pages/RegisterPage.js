import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/auth';
import { getInvisibleCaptchaToken } from '../utils/captchaUtils';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Body.css';

const RegisterPage = () => {
    // Step state: 1 = Form Input, 2 = Email OTP Verification
    const [step, setStep] = useState(1);

    // Form inputs
    const [username, setUsername] = useState('');
    const [namaLengkap, setNamaLengkap] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // OTP inputs & timer
    const [otpCode, setOtpCode] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // Status
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = new URLSearchParams(location.search).get('next');

    // Countdown Timer for OTP Resend
    useEffect(() => {
        let timer = null;
        if (step === 2 && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [step, countdown]);

    // Format and clean phone input
    const handlePhoneChange = (val) => {
        // Keep only numbers and plus
        const cleaned = val.replace(/[^0-9+]/g, '');
        setPhone(cleaned);
    };

    // Client-side validation helper
    const validateForm = () => {
        if (!namaLengkap.trim() || namaLengkap.trim().length < 2) {
            setError('Nama lengkap wajib diisi (minimal 2 karakter).');
            return false;
        }
        if (!username.trim() || username.trim().length < 3) {
            setError('Username minimal 3 karakter.');
            return false;
        }
        if (!/^[a-z0-9_]+$/.test(username.trim())) {
            setError('Username hanya boleh berisi huruf kecil, angka, dan underscore (_).');
            return false;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Alamat email tidak valid.');
            return false;
        }
        const digitsOnly = phone.replace(/[^0-9]/g, '');
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
            setError('Nomor HP/WhatsApp tidak valid (harus 10 - 15 digit angka).');
            return false;
        }
        if (password.length < 8) {
            setError('Kata sandi minimal 8 karakter.');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Konfirmasi kata sandi tidak cocok.');
            return false;
        }
        return true;
    };

    // Step 1: Send OTP to Email
    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!validateForm()) return;

        setLoading(true);
        try {
            const captchaToken = await getInvisibleCaptchaToken('register-turnstile-container');
            const res = await authService.sendRegisterOTP(
                username.trim(),
                email.trim().toLowerCase(),
                password,
                namaLengkap.trim(),
                phone.trim(),
                captchaToken
            );

            setSuccessMessage(res.data?.message || 'Kode verifikasi telah dikirim ke email Anda.');
            setStep(2);
            setCountdown(60);
            setCanResend(false);
            setOtpCode('');
        } catch (err) {
            let errorMsg = 'Gagal mengirim kode verifikasi.';
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'object') {
                    errorMsg = Object.keys(data)
                        .map((key) => `${Array.isArray(data[key]) ? data[key].join(', ') : data[key]}`)
                        .join('. ');
                } else if (typeof data === 'string') {
                    errorMsg = data;
                }
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (!canResend || resending) return;
        setError('');
        setSuccessMessage('');
        setResending(true);

        try {
            const captchaToken = await getInvisibleCaptchaToken('register-turnstile-container');
            const res = await authService.sendRegisterOTP(
                username.trim(),
                email.trim().toLowerCase(),
                password,
                namaLengkap.trim(),
                phone.trim(),
                captchaToken
            );
            setSuccessMessage(res.data?.message || 'Kode verifikasi baru telah dikirim ke email.');
            setCountdown(60);
            setCanResend(false);
        } catch (err) {
            const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Gagal mengirim ulang kode. Coba beberapa saat lagi.';
            setError(errMsg);
        } finally {
            setResending(false);
        }
    };

    // Step 2: Verify OTP & Complete Registration
    const handleVerifyAndRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanedOtp = otpCode.trim();
        if (cleanedOtp.length !== 6) {
            setError('Kode verifikasi harus 6 digit angka.');
            return;
        }

        setLoading(true);
        try {
            const captchaToken = await getInvisibleCaptchaToken('register-turnstile-container');
            await authService.register(
                username.trim(),
                email.trim().toLowerCase(),
                password,
                namaLengkap.trim(),
                phone.trim(),
                cleanedOtp,
                captchaToken
            );

            sessionStorage.setItem('just_registered', 'true');
            const loginUrl = nextPath ? `/login?next=${nextPath}` : '/login';
            navigate(loginUrl, { state: { registered: true, email: email.trim().toLowerCase() } });
        } catch (err) {
            let errorMsg = 'Gagal memverifikasi pendaftaran.';
            if (err.response?.data) {
                const data = err.response.data;
                if (data.otp_code) {
                    errorMsg = Array.isArray(data.otp_code) ? data.otp_code.join(' ') : data.otp_code;
                } else if (typeof data === 'object') {
                    errorMsg = Object.keys(data)
                        .map((key) => `${Array.isArray(data[key]) ? data[key].join(', ') : data[key]}`)
                        .join('. ');
                } else if (typeof data === 'string') {
                    errorMsg = data;
                }
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-Up / Login
    const handleGoogleRegister = async (credentialResponse) => {
        try {
            if (!credentialResponse?.credential) {
                setError('Gagal mendapatkan token dari Google. Silakan coba lagi.');
                return;
            }
            const response = await authService.googleLogin(credentialResponse.credential);

            const userProfile = {
                access: response.access,
                refresh: response.refresh,
                id: response.id,
                username: response.username,
                email: response.email,
                role: response.role,
                picture: response.picture || null,
                is_verified_member: response.is_verified_member,
                accessible_menus: response.accessible_menus,
                is_profile_complete: response.is_profile_complete,
                user_agreement_accepted: response.user_agreement_accepted,
            };
            localStorage.setItem('user', JSON.stringify(userProfile));

            if (response.is_new_user) {
                sessionStorage.setItem('just_registered', 'true');
            }
            const dest = nextPath || '/';
            navigate(dest);
        } catch (err) {
            const errMsg = err?.response?.data?.error || err?.message || 'Gagal mendaftar dengan Google';
            setError(`Gagal mendaftar dengan Google: ${errMsg}`);
            console.error('Google register error:', err?.response?.data || err);
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
                <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-3xl p-7 text-white text-center mb-6 shadow-xl shadow-green-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <span className="material-icons text-3xl">how_to_reg</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Daftar Akun Baru</h1>
                    <p className="text-white/80 text-xs mt-1">Bergabung dengan ekosistem Barakah Economy Community</p>

                    {/* Step Indicator */}
                    <div className="mt-5 flex items-center justify-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 1 ? 'bg-white text-green-700 shadow-md' : 'bg-white/20 text-white'}`}>
                            <span className="w-4 h-4 rounded-full bg-green-700 text-white text-[10px] flex items-center justify-center font-black">1</span>
                            Data Diri
                        </div>
                        <span className="text-white/40 material-icons text-sm">chevron_right</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 2 ? 'bg-white text-green-700 shadow-md' : 'bg-white/20 text-white/70'}`}>
                            <span className="w-4 h-4 rounded-full bg-green-700 text-white text-[10px] flex items-center justify-center font-black">2</span>
                            Verifikasi Email
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6">
                        {/* Error & Success Messages */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3 animate-shake">
                                <span className="material-icons text-red-500 text-xl flex-shrink-0 mt-0.5">error_outline</span>
                                <div>
                                    <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Pendaftaran Belum Berhasil</p>
                                    <p className="text-xs text-red-600 font-medium mt-0.5 leading-relaxed">{error}</p>
                                </div>
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
                                <span className="material-icons text-emerald-500 text-xl flex-shrink-0 mt-0.5">check_circle</span>
                                <div>
                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Berhasil</p>
                                    <p className="text-xs text-emerald-700 font-medium mt-0.5 leading-relaxed">{successMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* STEP 1: FORM INPUT DATA DIRI                        */}
                        {/* ==================================================== */}
                        {step === 1 && (
                            <>
                                {/* Google Quick Sign Up */}
                                <div className="mb-5">
                                    <p className="text-[11px] text-center text-gray-500 font-bold uppercase tracking-widest mb-3">Daftar Cepat dengan Akun Google</p>
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

                                <div className="flex items-center gap-3 mb-5">
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">atau isi data lengkap</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                </div>

                                <form onSubmit={handleSendOTP} className="space-y-4">
                                    {/* Nama Lengkap */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                            Nama Lengkap <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="reg-nama"
                                            type="text"
                                            placeholder="Nama lengkap sesuai KTP"
                                            value={namaLengkap}
                                            onChange={(e) => setNamaLengkap(e.target.value)}
                                            required
                                            className={inputClass}
                                        />
                                    </div>

                                    {/* Username */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                            Username <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="reg-username"
                                            type="text"
                                            placeholder="huruf kecil, angka, underscore"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                            required
                                            className={inputClass}
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">Hanya huruf kecil, angka, dan underscore (_)</p>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                            Email Aktif <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="reg-email"
                                            type="email"
                                            placeholder="nama@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                                            required
                                            className={inputClass}
                                        />
                                        <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-icons text-xs">verified</span> Kode verifikasi 6-digit akan dikirimkan ke email ini
                                        </p>
                                    </div>

                                    {/* No HP / WhatsApp */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                            No. WhatsApp / HP <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="reg-phone"
                                            type="tel"
                                            placeholder="Contoh: 081234567890"
                                            value={phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            required
                                            className={inputClass}
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">Gunakan nomor aktif untuk notifikasi sistem (min. 10 digit)</p>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                            Kata Sandi <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="reg-password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Minimal 8 karakter"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
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
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                            Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="reg-confirm-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Ulangi kata sandi"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className={`${inputClass} ${confirmPassword && password !== confirmPassword ? 'border-red-300 ring-2 ring-red-200' : ''}`}
                                        />
                                        {confirmPassword && password !== confirmPassword && (
                                            <p className="text-xs text-red-500 mt-1">Kata sandi tidak cocok</p>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        id="reg-submit-step1"
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition disabled:opacity-60 mt-4 active:scale-95"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                </svg>
                                                Mengirim Kode Verifikasi...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <span>Lanjutkan & Kirim Kode OTP</span>
                                                <span className="material-icons text-sm">arrow_forward</span>
                                            </span>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* ==================================================== */}
                        {/* STEP 2: VERIFIKASI EMAIL OTP                         */}
                        {/* ==================================================== */}
                        {step === 2 && (
                            <div className="animate-fade-in">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-green-100">
                                        <span className="material-icons text-3xl">mark_email_read</span>
                                    </div>
                                    <h2 className="text-lg font-black text-gray-800">Verifikasi Email Anda</h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Kode 6-digit telah dikirim ke alamat:
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full inline-block mt-1">
                                        {email}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-2">
                                        Periksa kotak masuk (Inbox) atau folder <b>Spam / Promosi</b> email Anda.
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
                                            Masukkan 6 Digit Kode Verifikasi:
                                        </label>
                                        <div className="flex justify-center">
                                            <input
                                                id="reg-otp-code"
                                                type="text"
                                                maxLength={6}
                                                placeholder="------"
                                                value={otpCode}
                                                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                                autoFocus
                                                required
                                                className="w-48 text-center py-3 text-3xl font-mono font-black tracking-[0.4em] bg-gray-50 border-2 border-green-500 rounded-2xl text-gray-900 outline-none focus:ring-4 focus:ring-green-100 transition shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <button
                                        id="reg-submit-step2"
                                        type="submit"
                                        disabled={loading || otpCode.length !== 6}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition disabled:opacity-50 active:scale-95"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                </svg>
                                                Memverifikasi...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <span className="material-icons text-sm">verified_user</span>
                                                Verifikasi & Selesaikan Pendaftaran
                                            </span>
                                        )}
                                    </button>

                                    {/* Resend OTP & Change Info */}
                                    <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-3">
                                        <div className="text-center">
                                            {countdown > 0 ? (
                                                <p className="text-xs text-gray-400 font-medium">
                                                    Kirim ulang kode dalam <span className="font-bold text-green-700">{countdown}s</span>
                                                </p>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResendOTP}
                                                    disabled={resending}
                                                    className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 mx-auto"
                                                >
                                                    <span className="material-icons text-xs">{resending ? 'refresh' : 'replay'}</span>
                                                    {resending ? 'Mengirim ulang...' : 'Kirim Ulang Kode OTP'}
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStep(1);
                                                setError('');
                                                setSuccessMessage('');
                                            }}
                                            className="text-xs text-gray-500 hover:text-gray-700 font-semibold hover:underline flex items-center gap-1"
                                        >
                                            <span className="material-icons text-xs">arrow_back</span>
                                            Ubah Data / Email Pendaftaran
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="mt-6 text-center pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-600">
                                Sudah punya akun?{' '}
                                <Link to="/login" className="text-green-600 hover:text-green-700 font-bold hover:underline">
                                    Login di sini
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Trust Badge */}
                <div className="mt-6 flex items-center justify-center gap-4 text-gray-400 text-xs text-center">
                    <span className="flex items-center gap-1">
                        <span className="material-icons text-xs text-emerald-500">lock</span> 256-Bit SSL Encrypted
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <span className="material-icons text-xs text-emerald-500">shield</span> Anti-Bot Protected
                    </span>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default RegisterPage;
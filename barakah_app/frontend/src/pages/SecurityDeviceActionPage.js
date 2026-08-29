import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const SecurityDeviceActionPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const isBlockAction = location.pathname.includes('block-device');
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) {
            setError('Token verifikasi keamanan tidak ditemukan.');
            setLoading(false);
            return;
        }

        const endpoint = isBlockAction
            ? `${process.env.REACT_APP_API_BASE_URL || ''}/api/auth/security/block-device/`
            : `${process.env.REACT_APP_API_BASE_URL || ''}/api/auth/security/confirm-device/`;

        axios.post(endpoint, { token })
            .then(res => {
                setResult(res.data);
            })
            .catch(err => {
                setError(err?.response?.data?.error || 'Gagal memproses tindakan keamanan.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [token, isBlockAction]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center animate-fade-in">
                {loading ? (
                    <div className="py-12">
                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-base font-bold text-gray-800">Memproses Verifikasi Keamanan...</h2>
                        <p className="text-xs text-gray-400 mt-1">Harap tunggu sebentar</p>
                    </div>
                ) : error ? (
                    <div className="py-6">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <span className="material-icons text-3xl">error_outline</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Tautan Tidak Valid</h2>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition"
                        >
                            Kembali ke Beranda
                        </button>
                    </div>
                ) : isBlockAction ? (
                    <div className="py-4">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <span className="material-icons text-3xl">shield</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Perangkat Telah Diblokir</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Akses dari perangkat ini telah berhasil dihentikan demi melindungi keamanan akun Anda.
                        </p>

                        {result && (
                            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-left text-xs mb-6 space-y-1.5 text-gray-700">
                                <p><b>Perangkat:</b> {result.device_name || 'Device'}</p>
                                <p><b>Lokasi:</b> {result.location || 'Indonesia'}</p>
                                <p><b>Status:</b> <span className="text-rose-600 font-bold">Diblokir Permanen ❌</span></p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <button
                                onClick={() => navigate('/profile')}
                                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition"
                            >
                                Buka Profil & Ganti Password
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                            >
                                Kembali ke Beranda
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <span className="material-icons text-3xl">verified_user</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Perangkat Terverifikasi</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Terima kasih telah mengonfirmasi bahwa login ini dilakukan oleh Anda.
                        </p>

                        {result && (
                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-left text-xs mb-6 space-y-1.5 text-gray-700">
                                <p><b>Perangkat:</b> {result.device_name || 'Device'}</p>
                                <p><b>Status:</b> <span className="text-emerald-700 font-bold">Terverifikasi Resmi ✅</span></p>
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition"
                        >
                            Lanjut ke Aplikasi
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SecurityDeviceActionPage;

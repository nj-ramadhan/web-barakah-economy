import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Body.css';

const WarningModal = ({ onClose, redirectPath }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleRegister = () => {
        const path = redirectPath ? `/register?next=${redirectPath}` : '/register';
        navigate(path);
    };

    const handleLogin = () => {
        if (user) {
            localStorage.removeItem('user');
        }
        const path = redirectPath ? `/login?next=${redirectPath}` : '/login';
        navigate(path);
    };

    const handleGoToHome = () => {
        navigate('/'); // Redirect to home page
    };

    if (user) {
        return (
            <div className="body flex items-center justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-xl py-12 max-w-md mx-6">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons text-3xl">lock</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-center text-gray-800">Akses Ditolak</h2>
                    <p className="text-sm mb-6 text-center text-gray-600 leading-relaxed">
                        Akun Anda (<strong>{user.username}</strong>) tidak memiliki akses untuk membuka halaman ini. Silakan masuk dengan akun lain yang memiliki izin, atau kembali ke beranda.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={handleLogin}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100 transition-all active:scale-95"
                        >
                            <span className="material-icons text-sm">login</span>Masuk dengan Akun Lain
                        </button>
                        <button
                            onClick={handleGoToHome}
                            className="w-full bg-gray-50 text-gray-500 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <span className="material-icons text-sm">home</span>Kembali ke Beranda
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="body flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl py-12 max-w-md mx-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Akses Dibatasi</h2>
                <p className="text-sm mb-6 text-gray-600 leading-relaxed">Kamu harus terdaftar sebagai anggota untuk mengakses fitur ini. Mau mendaftar atau log masuk sekarang?</p>
                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={handleLogin}
                        className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95"
                    >
                        <span className="material-icons text-sm">login</span>Masuk Sekarang
                    </button>
                    <button
                        onClick={handleRegister}
                        className="w-full bg-white border-2 border-green-600 text-green-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <span className="material-icons text-sm">person_add</span>Mendaftar Baru
                    </button>
                    <button
                        onClick={handleGoToHome}
                        className="w-full bg-gray-50 text-gray-500 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <span className="material-icons text-sm">home</span>Kembali ke Beranda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarningModal;
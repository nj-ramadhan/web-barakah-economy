import React from 'react';
import { useNavigate } from 'react-router-dom';

const WarningModal = ({ onClose }) => {
    const navigate = useNavigate();

    const handleRegister = () => {
        navigate('/register'); // Redirect to register page
    };

    const handleGoToHome = () => {
        navigate('/'); // Redirect to home page
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-200">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Akses Dibatasi</h2>
                <p className="mb-4">Kamu harus terdaftar sebagai anggota untuk mengakses fitur ini. Mau mendaftar sekarang?</p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={handleGoToHome}
                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                    >
                        Kembali ke Beranda
                    </button>
                    <button
                        onClick={handleRegister}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                    >
                        Mendaftar Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarningModal;
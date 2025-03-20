import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Body.css';

const WarningModal = ({ onClose }) => {
    const navigate = useNavigate();

    const handleRegister = () => {
        navigate('/register'); // Redirect to register page
    };

    const handleGoToHome = () => {
        navigate('/'); // Redirect to home page
    };

    return (
        <div className="body">
            <div className="bg-white p-6 rounded-lg shadow-lg py-12">
                <h2 className="text-lg font-bold mb-4">Akses Dibatasi</h2>
                <p className="text-sm mb-4">Kamu harus terdaftar sebagai anggota untuk mengakses fitur ini. Mau mendaftar atau log masuk sekarang?</p>
                <div className="w-full flex justify-between space-x-4">                  
                    <button
                        onClick={handleGoToHome}
                        className="bg-gray-500 hover:bg-gray-600 text-sm text-white py-2 px-4 rounded"
                    >
                        <span className="material-icons text-sm mr-2">home</span>Kembali ke Beranda
                    </button>
                    <button
                        onClick={handleRegister}
                        className="bg-green-600 hover:bg-green-700 text-sm text-white py-2 px-4 rounded"
                    >
                        <span className="material-icons text-sm mr-2">person</span>Mendaftar Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarningModal;
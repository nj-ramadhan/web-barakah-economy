import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ className = '', label = 'Kembali', fallback = '/dashboard' }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        // If there's history, go back. Otherwise fallback.
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate(fallback);
        }
    };

    return (
        <button
            onClick={handleBack}
            className={`flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors py-2 px-3 hover:bg-green-50 rounded-lg w-fit ${className}`}
        >
            <span className="material-icons text-xl leading-none">arrow_back_ios_new</span>
            <span className="font-bold text-sm">{label}</span>
        </button>
    );
};

export default BackButton;

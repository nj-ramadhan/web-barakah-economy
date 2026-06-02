import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE_URL;

const GlobalStreamingPopup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [settings, setSettings] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    const fetchStreamingStatus = async () => {
        // Don't show popup if the user is already on the streaming page
        if (location.pathname === '/streaming') {
            setIsVisible(false);
            return;
        }

        // Check if user has closed the popup in this session
        const isClosedThisSession = sessionStorage.getItem('bae_stream_popup_closed');
        if (isClosedThisSession === 'true') {
            return;
        }

        try {
            const res = await axios.get(`${API}/api/streaming/settings/`);
            if (res.data && res.data.is_live) {
                setSettings(res.data);
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } catch (err) {
            console.error('Gagal mengambil status live streaming:', err);
        }
    };

    useEffect(() => {
        fetchStreamingStatus();

        // Check live status every 15 seconds
        const interval = setInterval(fetchStreamingStatus, 15000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    const handleClose = (e) => {
        e.stopPropagation(); // Prevent navigation click
        setIsVisible(false);
        sessionStorage.setItem('bae_stream_popup_closed', 'true');
    };

    const handleWatch = () => {
        setIsVisible(false);
        navigate('/streaming');
    };

    if (!isVisible || !settings) return null;

    return (
        <div 
            onClick={handleWatch}
            className="fixed z-[9999] bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 p-4 rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-indigo-500/30 text-white shadow-2xl shadow-indigo-500/10 cursor-pointer animate-fade-in hover:border-indigo-400/50 hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1"
        >
            <div className="flex gap-3 items-start relative">
                {/* Visual Indicator / Pulse */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-lg shadow-indigo-500/20">
                    <span className="material-icons text-white text-2xl animate-pulse">sensors</span>
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                </div>

                <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5">
                        <span className="bg-red-600 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                            LIVE
                        </span>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Barakah Economy</p>
                    </div>
                    <h4 className="font-black text-xs text-white truncate mt-1 leading-tight">
                        {settings.title || "Kajian Live Sedang Berlangsung"}
                    </h4>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {settings.description || "Mari bergabung dan tonton kajian live sekarang!"}
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white flex items-center justify-center transition border border-slate-700/50"
                    title="Tutup"
                >
                    <span className="material-icons text-[14px]">close</span>
                </button>
            </div>

            {/* Watch CTA Button */}
            <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                <span className="text-[9px] text-indigo-300 font-bold">Ketuk untuk menonton</span>
                <div className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition shadow-md shadow-indigo-600/10 border border-indigo-500/30">
                    Gabung
                    <span className="material-icons text-[10px]">arrow_forward</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalStreamingPopup;

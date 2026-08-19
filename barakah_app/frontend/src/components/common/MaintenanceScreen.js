import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const MaintenanceScreen = ({ setting, onRefresh }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const formatEstimatedTime = (timeStr) => {
        if (!timeStr) return null;
        try {
            const d = new Date(timeStr);
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' WIB';
        } catch (e) {
            return timeStr;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
            <Helmet>
                <title>{setting?.title || 'Pemeliharaan Sistem'} - Barakah Economy</title>
            </Helmet>

            {/* Background glowing orbs */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-lg w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center animate-fade-in">
                {/* Logo & Status Badge */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 mb-4 flex items-center justify-center">
                        <div className="w-full h-full bg-slate-900/80 rounded-2xl flex items-center justify-center">
                            <span className="material-icons text-amber-400 text-4xl animate-pulse">engineering</span>
                        </div>
                    </div>

                    <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Mode Perawatan (Maintenance)
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                    {setting?.title || 'Mohon Maaf, Web Sedang Dalam Pemeliharaan'}
                </h1>

                {/* Message */}
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-line">
                    {setting?.message || 'Kami sedang melakukan peningkatan performa dan pemeliharaan sistem berkala. Layanan akan segera aktif kembali.'}
                </p>

                {/* Estimated completion card */}
                {setting?.estimated_end && (
                    <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3 text-left">
                        <span className="material-icons text-emerald-400 text-2xl">schedule</span>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                                Estimasi Selesai
                            </p>
                            <p className="text-xs sm:text-sm font-black text-white">
                                {formatEstimatedTime(setting.estimated_end)}
                            </p>
                        </div>
                    </div>
                )}

                {/* User Status info if logged in as regular user */}
                {user && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-6 text-xs text-gray-400 flex items-center justify-between">
                        <div className="text-left">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Login Sebagai</p>
                            <p className="font-bold text-gray-200">@{user.username} ({user.role || 'Member'})</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold transition border border-red-500/30"
                        >
                            Logout
                        </button>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={onRefresh || (() => window.location.reload())}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <span className="material-icons text-base">refresh</span>
                        Cek Status Kembali
                    </button>

                    {!user && (
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition border border-white/20 flex items-center justify-center gap-2 active:scale-95"
                        >
                            <span className="material-icons text-base">admin_panel_settings</span>
                            Login Admin
                        </button>
                    )}
                </div>
            </div>

            {/* Footer Notice */}
            <p className="mt-8 text-xs text-gray-400 font-medium">
                &copy; {new Date().getFullYear()} Barakah Economy Community. All rights reserved.
            </p>
        </div>
    );
};

export default MaintenanceScreen;

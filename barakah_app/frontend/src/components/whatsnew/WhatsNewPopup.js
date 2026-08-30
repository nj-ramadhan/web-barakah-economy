import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import siteContentService from '../../services/siteContent';

const WhatsNewPopup = () => {
    const navigate = useNavigate();
    const [popupItem, setPopupItem] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [dontRemindAgain, setDontRemindAgain] = useState(true);

    useEffect(() => {
        const checkLatestPopup = async () => {
            try {
                const res = await siteContentService.getLatestWhatsNewPopup();
                if (res.data && res.data.id) {
                    const neverShowId = localStorage.getItem('never_show_whats_new_id');
                    // If user checked "Jangan ingatkan lagi" for this exact ID, do not show
                    if (neverShowId === res.data.id.toString()) {
                        return;
                    }
                    
                    const lastDismissedId = localStorage.getItem('dismissed_whats_new_popup_id');
                    if (lastDismissedId !== res.data.id.toString()) {
                        setPopupItem(res.data);
                        setIsOpen(true);
                    }
                }
            } catch (err) {
                // silent
            }
        };

        const timer = setTimeout(checkLatestPopup, 1200);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        if (popupItem) {
            localStorage.setItem('dismissed_whats_new_popup_id', popupItem.id.toString());
            if (dontRemindAgain) {
                localStorage.setItem('never_show_whats_new_id', popupItem.id.toString());
            }
        }
        setIsOpen(false);
    };

    const handleAction = () => {
        if (popupItem) {
            localStorage.setItem('dismissed_whats_new_popup_id', popupItem.id.toString());
            if (dontRemindAgain) {
                localStorage.setItem('never_show_whats_new_id', popupItem.id.toString());
            }
        }
        setIsOpen(false);
        if (popupItem?.action_button_url) {
            if (popupItem.action_button_url.startsWith('http')) {
                window.open(popupItem.action_button_url, '_blank');
            } else {
                navigate(popupItem.action_button_url);
            }
        } else {
            navigate('/whats-new');
        }
    };

    if (!isOpen || !popupItem) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6 animate-scale-up flex flex-col">
                {/* Cover Image Header */}
                <div className="relative h-48 bg-gradient-to-br from-emerald-800 to-teal-900 overflow-hidden">
                    {popupItem.cover_image ? (
                        <img
                            src={popupItem.cover_image}
                            alt={popupItem.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-4 text-center">
                            <span className="material-icons text-5xl mb-1 text-amber-300">auto_awesome</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Pembaruan Sistem</span>
                        </div>
                    )}

                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                        title="Tutup"
                    >
                        ✕
                    </button>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                            {popupItem.badge_label || 'Fitur Baru'}
                        </span>
                        {popupItem.version && (
                            <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                {popupItem.version}
                            </span>
                        )}
                    </div>
                </div>

                {/* Body Details */}
                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-base font-black text-gray-900 mb-2 leading-snug">
                        {popupItem.title}
                    </h3>

                    {popupItem.summary && (
                        <p className="text-xs text-gray-600 mb-3 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 leading-relaxed font-medium">
                            {popupItem.summary}
                        </p>
                    )}

                    {popupItem.content_type === 'bullet_list' && Array.isArray(popupItem.bullet_items) && popupItem.bullet_items.length > 0 && (
                        <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto custom-scrollbar">
                            {popupItem.bullet_items.map((bullet, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded-xl">
                                    <span className="material-icons text-emerald-600 text-sm mt-0.5 shrink-0">check_circle</span>
                                    <span>{bullet}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {popupItem.content_type === 'rich_text' && popupItem.content_html && (
                        <div className="text-xs text-gray-700 max-h-36 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed mb-4">
                            {popupItem.content_html}
                        </div>
                    )}

                    {/* Don't remind again checkbox */}
                    <div className="pt-2 pb-1 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-gray-500 hover:text-gray-700">
                            <input
                                type="checkbox"
                                checked={dontRemindAgain}
                                onChange={(e) => setDontRemindAgain(e.target.checked)}
                                className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <span>Jangan ingatkan lagi untuk update ini</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition"
                        >
                            Tutup
                        </button>

                        <button
                            onClick={handleAction}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition"
                        >
                            <span>{popupItem.action_button_text || 'Pelajari Lebih Lanjut'}</span>
                            <span className="material-icons text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsNewPopup;


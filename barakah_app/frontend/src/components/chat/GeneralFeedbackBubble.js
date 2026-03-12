import React, { useState } from 'react';
import { submitGeneralFeedback } from '../../services/chatApi';

const GeneralFeedbackBubble = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [loading, setLoading] = useState(false);
    const currentUser = JSON.parse(localStorage.getItem('user'));

    if (!currentUser) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            await submitGeneralFeedback({ content, urgent });
            alert('Terima kasih! Kritik & Saran Anda telah terkirim.');
            setContent('');
            setUrgent(false);
            setIsOpen(false);
        } catch (err) {
            alert('Gagal mengirim saran. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-[9999]">
            {/* Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isOpen ? 'bg-rose-500 rotate-90 scale-110' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-110'}`}
            >
                <div className="relative w-6 h-6 flex items-center justify-center">
                    <span className={`material-icons text-white text-2xl absolute transition-all duration-300 ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`}>
                        close
                    </span>
                    <span className={`material-icons text-white text-2xl absolute transition-all duration-300 ${!isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-45'}`}>
                        rate_review
                    </span>
                </div>
            </button>

            {/* Modal/Popup */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Kritik & Saran</h3>
                        <p className="text-[10px] text-gray-400">Punya kendala atau ide untuk kemajuan Barakah App? Beritahu Admin di sini!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                            rows="4"
                            required
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Tulis kritik, saran, atau kendala Anda..."
                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
                        ></textarea>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={urgent}
                                onChange={(e) => setUrgent(e.target.checked)}
                                className="w-4 h-4 rounded-lg text-rose-500 focus:ring-rose-500 border-gray-200"
                            />
                            <span className="text-[10px] font-bold text-gray-500 group-hover:text-rose-500 transition-colors">Ini Masalah Mendesak?</span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                            {loading ? 'Mengirim...' : 'Kirim ke Admin'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default GeneralFeedbackBubble;

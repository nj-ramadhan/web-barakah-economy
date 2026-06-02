import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;

// Helper to get authorization header
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access ? { headers: { Authorization: `Bearer ${user.access}` } } : null;
};

const StreamingPage = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [likes, setLikes] = useState({ total_likes: 0, has_liked: false });
    const [isSending, setIsSending] = useState(false);
    const [isPlayerError, setIsPlayerError] = useState(false);
    
    const user = JSON.parse(localStorage.getItem('user'));
    const isLoggedIn = !!user;

    const videoRef = useRef(null);
    const chatEndRef = useRef(null);
    const hlsInstanceRef = useRef(null);

    // 1. Fetch Streaming Settings (Is Live, Title, Description, HLS URL)
    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API}/api/streaming/settings/`, getAuth() || {});
            setSettings(res.data);
        } catch (err) {
            console.error('Gagal mengambil data settings streaming:', err);
        }
    };

    // 2. Fetch Chat / Comments
    const fetchComments = async () => {
        try {
            const res = await axios.get(`${API}/api/streaming/comments/`);
            // Sort by created_at ascending
            const sortedComments = (res.data.results || res.data).sort(
                (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
            setComments(sortedComments);
        } catch (err) {
            console.error('Gagal mengambil komentar:', err);
        }
    };

    // 3. Fetch Likes Status & Count
    const fetchLikes = async () => {
        try {
            const res = await axios.get(`${API}/api/streaming/likes/`, getAuth() || {});
            setLikes(res.data);
        } catch (err) {
            console.error('Gagal mengambil likes:', err);
        }
    };

    // Initial Load & Polling for Comments
    useEffect(() => {
        fetchSettings();
        fetchComments();
        fetchLikes();

        // Poll chat comments every 3 seconds
        const chatInterval = setInterval(() => {
            fetchComments();
        }, 3000);

        // Poll live settings status every 10 seconds
        const settingsInterval = setInterval(() => {
            fetchSettings();
        }, 10000);

        return () => {
            clearInterval(chatInterval);
            clearInterval(settingsInterval);
            if (hlsInstanceRef.current) {
                hlsInstanceRef.current.destroy();
            }
        };
    }, []);

    // Scroll chat window to bottom on new comments
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    // 4. Initialize HLS Video Player
    useEffect(() => {
        if (!settings || !settings.is_live || !settings.stream_key || !videoRef.current) return;

        const hlsUrl = `${API}${settings.hls_url}`;
        const video = videoRef.current;

        // Cleanup existing instance
        if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
            hlsInstanceRef.current = null;
        }

        // Check if Hls.js is supported in browser
        if (window.Hls) {
            const hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            hlsInstanceRef.current = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(err => console.log("Auto-play blocked by browser. User gesture required."));
            });

            hls.on(window.Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                            console.log("HLS network error, attempting to recover...");
                            hls.startLoad();
                            break;
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                            console.log("HLS media error, attempting to recover...");
                            hls.recoverMediaError();
                            break;
                        default:
                            setIsPlayerError(true);
                            hls.destroy();
                            break;
                    }
                }
            });
        } 
        // Native HLS support (Safari)
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(err => console.log("Safari auto-play blocked."));
            });
        } else {
            setIsPlayerError(true);
        }
    }, [settings]);

    // Load Hls.js script from CDN dynamically if not available on window
    useEffect(() => {
        if (!window.Hls) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            script.async = true;
            document.body.appendChild(script);
            script.onload = () => {
                // Trigger state update to re-evaluate the player initialization
                setSettings(prev => prev ? { ...prev } : null);
            };
        }
    }, []);

    // 5. Send Comment Handler
    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || isSending) return;

        setIsSending(true);
        try {
            await axios.post(
                `${API}/api/streaming/comments/`,
                { message: newComment },
                getAuth()
            );
            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error('Gagal mengirim komentar:', err);
            alert('Gagal mengirim komentar. Coba lagi.');
        } finally {
            setIsSending(false);
        }
    };

    // 6. Like Streaming Handler
    const handleLike = async () => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        try {
            const res = await axios.post(`${API}/api/streaming/likes/`, {}, getAuth());
            setLikes({
                total_likes: res.data.total_likes,
                has_liked: res.data.liked
            });
        } catch (err) {
            console.error('Gagal melakukan like:', err);
        }
    };

    // 7. Share Handler
    const handleShare = () => {
        const shareUrl = `${window.location.origin}/streaming`;
        navigator.clipboard.writeText(shareUrl);
        alert('Link streaming berhasil disalin ke clipboard!');
    };

    const handleWhatsAppShare = () => {
        const shareUrl = `${window.location.origin}/streaming`;
        const text = `Yuk tonton siaran langsung live streaming Barakah Economy sekarang di: ${shareUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col pt-16 pb-20 overflow-x-hidden">
            <Helmet>
                <title>{settings?.is_live && settings?.title ? settings.title : "Live Streaming"} | BARAKAH APP</title>
                <meta name="description" content={settings?.description || "Ikuti live streaming kajian serta program Barakah Economy."} />
            </Helmet>
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
                
                {/* ── LEFT PANEL: VIDEO PLAYER ── */}
                <div className="flex-1 flex flex-col space-y-4">
                    {/* Video wrapper */}
                    <div className="relative aspect-video w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 group">
                        {settings?.is_live ? (
                            <>
                                <video
                                    ref={videoRef}
                                    controls
                                    className="w-full h-full object-cover"
                                    playsInline
                                />
                                {isPlayerError && (
                                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-center p-6">
                                        <span className="material-icons text-red-500 text-5xl animate-bounce mb-3">error_outline</span>
                                        <h3 className="font-bold text-lg">Format Streaming Tidak Didukung</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-md">Browser Anda tidak mendukung pemutaran video HLS. Coba buka menggunakan Google Chrome atau Safari.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 to-slate-950 flex flex-col items-center justify-center text-center p-6">
                                <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center animate-pulse mb-4">
                                    <span className="material-icons text-indigo-400 text-4xl">sensors_off</span>
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-white">Live Streaming Belum Aktif</h3>
                                <p className="text-sm text-indigo-200/60 mt-1 max-w-md">Saat ini tidak ada siaran langsung. Silakan kembali lagi nanti atau cek jadwal kajian di beranda.</p>
                            </div>
                        )}
                        
                        {/* Live Badge indicator */}
                        {settings?.is_live && (
                            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-red-600/30">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                LIVE
                            </div>
                        )}
                    </div>

                    {/* Stream Info */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/60 rounded-3xl p-6 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                                    {settings?.is_live ? settings?.title : "Kajian Live Streaming"}
                                </h1>
                                <p className="text-xs text-indigo-400 font-bold mt-1 uppercase tracking-wider">
                                    Penyelenggara: Barakah Economy Community
                                </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Like Button */}
                                <button
                                    onClick={handleLike}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition border ${
                                        likes.has_liked
                                            ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-600/20'
                                            : 'bg-slate-800/80 border-slate-700/50 text-gray-300 hover:bg-slate-800 hover:border-rose-500/50'
                                    }`}
                                >
                                    <span className={`material-icons text-sm ${likes.has_liked ? 'animate-pulse text-white' : 'text-rose-500'}`}>
                                        {likes.has_liked ? 'favorite' : 'favorite_border'}
                                    </span>
                                    {likes.total_likes} Suka
                                </button>
                                
                                {/* WhatsApp Share */}
                                <button
                                    onClick={handleWhatsAppShare}
                                    className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/10 border border-emerald-500/30"
                                    title="Bagikan ke WhatsApp"
                                >
                                    <span className="material-icons text-base">share</span>
                                </button>
                                
                                {/* Copy Link */}
                                <button
                                    onClick={handleShare}
                                    className="flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-800/80 text-gray-300 border border-slate-700/50 hover:bg-slate-800 hover:text-white transition"
                                    title="Salin Link Streaming"
                                >
                                    <span className="material-icons text-base">link</span>
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-400 leading-relaxed pt-2 border-t border-slate-800/50">
                            {settings?.is_live && settings?.description
                                ? settings.description
                                : "Selamat bergabung di siaran langsung BAE. Silakan log in untuk berkomentar, menyukai, serta membagikan link live ini kepada keluarga dan kerabat untuk memperluas manfaat kajian."}
                        </p>
                    </div>
                </div>

                {/* ── RIGHT PANEL: COMMENTS CHAT ── */}
                <div className="w-full lg:w-[380px] h-[550px] lg:h-[620px] flex flex-col bg-slate-900/60 backdrop-blur-md border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Chat Header */}
                    <div className="p-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                            <h3 className="font-black text-sm uppercase tracking-wider text-white">Diskusi Live</h3>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-slate-700/30">
                            {comments.length} pesan
                        </span>
                    </div>

                    {/* Chat Body (Message feed) */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
                        {comments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 px-6">
                                <span className="material-icons text-slate-700 text-3xl mb-2">forum</span>
                                <p className="text-xs">Belum ada diskusi.</p>
                                <p className="text-[10px] text-gray-600 mt-0.5">Jadilah yang pertama untuk mengirimkan komentar hangat!</p>
                            </div>
                        ) : (
                            comments.map((chat) => (
                                <div key={chat.id} className="flex gap-2.5 items-start group">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-indigo-300">
                                        {(chat.user?.full_name || chat.user?.username || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="font-black text-xs text-indigo-200 truncate max-w-[120px]">
                                                {chat.user?.full_name || chat.user?.username}
                                            </span>
                                            <span className="text-[8px] text-gray-500">
                                                {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed mt-0.5 break-words">
                                            {chat.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Footer / Form */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800/80 relative">
                        {isLoggedIn ? (
                            <form onSubmit={handleSendComment} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ketik komentar Anda..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    maxLength={250}
                                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || isSending}
                                    className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition shadow-lg shadow-indigo-600/10 disabled:opacity-40 disabled:hover:bg-indigo-600 border border-indigo-500/30"
                                >
                                    <span className="material-icons text-base">send</span>
                                </button>
                            </form>
                        ) : (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                                <p className="text-xs text-indigo-200/80 font-bold mb-2">Login untuk Berkomentar</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-600/20 border border-indigo-500/30"
                                >
                                    Masuk Ke Akun BAE
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </main>

            <NavigationButton />
        </div>
    );
};

export default StreamingPage;

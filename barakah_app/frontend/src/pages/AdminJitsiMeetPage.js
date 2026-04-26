import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import NavigationButton from '../components/layout/Navigation';

const AdminJitsiMeetPage = () => {
    const APP_ID = 'vpaas-magic-cookie-32c71c4a7f724965932aa0cebb974fbd';
    const queryParams = new URLSearchParams(window.location.search);
    const initialRoom = queryParams.get('room');
    
    const [roomName, setRoomName] = useState(initialRoom || `Meet_${Math.random().toString(36).substring(7).toUpperCase()}`);
    const [isMeetingStarted, setIsMeetingStarted] = useState(!!initialRoom);
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);

    const startMeeting = () => {
        setIsMeetingStarted(true);
    };

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(user);
        } catch (e) { console.error(e); }
    }, []);

    // Periodic token refresh for logged-in host/creator
    useEffect(() => {
        if (!currentUser || !currentUser.refresh) return;

        const refreshInterval = setInterval(async () => {
            try {
                const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/token/refresh/`, {
                    refresh: currentUser.refresh
                });
                const newAccess = res.data.access;
                const updatedUser = { ...currentUser, access: newAccess };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                console.log("Session refreshed successfully during meeting.");
            } catch (err) {
                console.error("Failed to refresh session during meeting:", err);
            }
        }, 10 * 60 * 1000); // Every 10 minutes

        return () => clearInterval(refreshInterval);
    }, [currentUser]);

    useEffect(() => {
        if (isMeetingStarted && jitsiContainerRef.current && !jitsiApiRef.current) {
            const domain = '8x8.vc';
            const displayName = currentUser?.profile?.name_full || currentUser?.username || 'Guest';
            
            const options = {
                roomName: `${APP_ID}/${roomName}`,
                width: '100%',
                height: 600,
                parentNode: jitsiContainerRef.current,
                userInfo: {
                    displayName: displayName
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting', 'fullscreen',
                        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                        'security'
                    ],
                },
                configOverwrite: {
                    disableDeepLinking: true,
                    prejoinPageEnabled: false, // Langsung masuk agar lebih cepat
                },
            };

            // Load Jitsi API script for 8x8
            const script = document.createElement('script');
            script.src = `https://${domain}/external_api.js`;
            script.async = true;
            script.onload = () => {
                jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
            };
            document.body.appendChild(script);

            return () => {
                if (jitsiApiRef.current) {
                    jitsiApiRef.current.dispose();
                }
            };
        }
    }, [isMeetingStarted, roomName]);

    const handleShare = () => {
        const url = `${window.location.origin}/live-meet-test?room=${roomName}`;
        navigator.clipboard.writeText(url);
        alert('Link meeting berhasil disalin! Kirimkan link ini ke partner uji coba Anda.');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Helmet>
                <title>Uji Coba Jitsi Meet | Barakah Economy</title>
            </Helmet>

            <div className="max-w-6xl mx-auto px-4 pt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">UJI COBA LIVE MEET</h1>
                        <p className="text-gray-500 font-medium">Tes fitur video conference Jitsi Meet untuk Barakah Economy</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleShare}
                            className="bg-white border-2 border-emerald-500 text-emerald-600 font-black px-6 py-3 rounded-2xl shadow-sm hover:bg-emerald-50 transition flex items-center gap-2"
                        >
                            <span className="material-icons">share</span>
                            SALIN LINK UNDANGAN
                        </button>
                    </div>
                </div>

                {!isMeetingStarted ? (
                    <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-gray-100 text-center">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-icons text-5xl">videocam</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Siap untuk Memulai?</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Klik tombol di bawah untuk membuat ruang meeting baru secara instan.
                        </p>
                        <div className="flex flex-col items-center gap-4">
                            <input 
                                type="text" 
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="bg-gray-50 border-none rounded-xl px-6 py-4 text-center font-bold text-emerald-700 w-full max-w-sm focus:ring-2 focus:ring-emerald-500"
                                placeholder="Nama Ruangan..."
                            />
                            <button 
                                onClick={startMeeting}
                                className="bg-emerald-600 text-white font-black px-12 py-5 rounded-2xl shadow-lg hover:bg-emerald-700 transform transition hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                            >
                                Mulai Meeting Sekarang
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white min-h-[600px] relative">
                        <div ref={jitsiContainerRef} className="w-full h-full" />
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <span className="material-icons text-amber-500 mb-3">security</span>
                        <h3 className="font-black text-gray-900 mb-1">Keamanan</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">Room name diacak otomatis untuk mencegah orang asing masuk tanpa izin.</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <span className="material-icons text-blue-500 mb-3">devices</span>
                        <h3 className="font-black text-gray-900 mb-1">Multi-Device</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">Bisa diakses dari HP maupun Laptop tanpa install aplikasi tambahan.</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <span className="material-icons text-emerald-500 mb-3">fiber_manual_record</span>
                        <h3 className="font-black text-gray-900 mb-1">Rekaman</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">Fitur rekaman tersedia jika instruktur menghubungkan akun Dropbox.</p>
                    </div>
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default AdminJitsiMeetPage;

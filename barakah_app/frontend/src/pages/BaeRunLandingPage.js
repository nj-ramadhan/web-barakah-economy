import React from 'react';
import { Link } from 'react-router-dom';

const BaeRunLandingPage = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {/* Gradient Backgrounds */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/20 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex justify-between items-center px-6 py-6 md:px-20 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                        <span className="material-icons text-slate-900">directions_run</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter uppercase italic">BAE <span className="text-green-500">RUN</span></span>
                </Link>
                <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-slate-400">
                    <a href="#features" className="hover:text-green-400 transition">Fitur</a>
                    <a href="#stats" className="hover:text-green-400 transition">Statistik</a>
                    <a href="#download" className="hover:text-green-400 transition">Download</a>
                </div>
                <Link to="/" className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition">Kembali ke Web</Link>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-20 pb-40 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">New Experience</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic uppercase">
                        Run for <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Barakah</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                        Lacak setiap langkah Anda, bangun kebiasaan sehat, dan raih keberkahan melalui setiap tetes keringat. Terhubung langsung dengan ekosistem Barakah Economy.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                        <a href="#download" className="px-8 py-4 bg-green-500 text-slate-950 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-green-500/40 hover:scale-105 transition flex items-center gap-3">
                            <span className="material-icons">file_download</span>
                            Download APK
                        </a>
                        <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 text-slate-400 opacity-50 cursor-not-allowed">
                            <span className="material-icons">apple</span>
                            App Store
                        </div>
                    </div>
                </div>

                <div className="relative flex justify-center lg:justify-end animate-in fade-in zoom-in duration-1000">
                    <div className="relative w-72 h-[600px] md:w-80 md:h-[650px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden">
                        {/* Mockup Image */}
                        <img 
                            src="/media/bae_run_app_mockup_1777304049543.png" 
                            alt="BAE RUN App Mockup" 
                            className="w-full h-full object-cover"
                        />
                        {/* Glassmorphism Overlay */}
                        <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-950/80 to-transparent"></div>
                        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                    </div>
                    {/* Floating Stats */}
                    <div className="absolute -left-10 top-1/4 p-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl animate-bounce duration-[3000ms]">
                        <div className="text-3xl font-black text-green-400">12.4 <span className="text-xs uppercase text-slate-500">Km</span></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Distance</div>
                    </div>
                    <div className="absolute -right-10 bottom-1/4 p-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl animate-bounce duration-[4000ms]">
                        <div className="text-3xl font-black text-blue-400">5:24 <span className="text-xs uppercase text-slate-500">Min</span></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Pace</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-40 bg-slate-900/50 backdrop-blur-sm border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6 text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">Powerful <span className="text-green-500">Features</span></h2>
                    <p className="text-slate-400 mt-4 max-w-xl mx-auto uppercase tracking-widest text-xs font-bold">Teknologi mutakhir untuk mendukung gaya hidup barakah Anda.</p>
                </div>
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { icon: 'location_on', title: 'Precision GPS', desc: 'Pelacakan rute lari Anda secara akurat dengan teknologi GPS terintegrasi GeoDjango.' },
                        { icon: 'trending_up', title: 'Deep Analytics', desc: 'Analisis mendalam mengenai pace, kecepatan, durasi, dan kalori yang terbakar.' },
                        { icon: 'history', title: 'Cloud History', desc: 'Riwayat aktivitas tersimpan aman di cloud Barakah Economy, akses kapan saja.' }
                    ].map((f, i) => (
                        <div key={i} className="p-10 bg-slate-950 rounded-[2.5rem] border border-white/5 hover:border-green-500/30 transition group">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-green-500/10 transition">
                                <span className="material-icons text-3xl text-green-500">{f.icon}</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">{f.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Download Section */}
            <section id="download" className="relative z-10 py-40 px-6">
                <div className="max-w-4xl mx-auto bg-gradient-to-br from-green-500 to-blue-600 rounded-[3rem] p-12 md:p-20 text-center shadow-2xl shadow-green-500/20 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="relative z-10">
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase text-slate-950 leading-none mb-8">Ready to <br/> start?</h2>
                        <p className="text-slate-900/70 font-bold mb-12 max-w-md mx-auto leading-relaxed">Dapatkan akses eksklusif versi beta untuk Android sekarang juga. Bangun komunitas lari Barakah bersama kami.</p>
                        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                            <button className="w-full md:w-auto px-10 py-5 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-105 transition shadow-2xl">
                                <span className="material-icons text-3xl">android</span>
                                <div>
                                    <div className="text-[10px] text-slate-400 text-left">GET IT FOR</div>
                                    <div>Android (.APK)</div>
                                </div>
                            </button>
                            <div className="text-slate-950/50 font-black text-xs uppercase tracking-[0.3em]">OR</div>
                            <div className="w-full md:w-auto px-10 py-5 bg-slate-950/20 border border-slate-950/20 text-slate-950 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-4 opacity-60 cursor-not-allowed">
                                <span className="material-icons text-3xl">qr_code_2</span>
                                <div>
                                    <div className="text-[10px] text-slate-950/50 text-left">SCAN TO</div>
                                    <div>Install Now</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-20 border-t border-white/5 text-center">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.5em] mb-4">© 2026 BARAKAH ECONOMY - BAE RUN</div>
                <div className="flex justify-center gap-6 text-slate-400">
                    <span className="material-icons text-sm hover:text-white cursor-pointer">facebook</span>
                    <span className="material-icons text-sm hover:text-white cursor-pointer">instagram</span>
                    <span className="material-icons text-sm hover:text-white cursor-pointer">twitter</span>
                </div>
            </footer>
        </div>
    );
};

export default BaeRunLandingPage;

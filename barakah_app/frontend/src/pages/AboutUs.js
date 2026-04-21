// pages/AboutUs.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/Body.css';

const AboutUs = () => {
  const [aboutUs, setAboutUs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/`);
        const data = response.data.results || response.data;
        if (Array.isArray(data) && data.length > 0) {
          setAboutUs(data[0]);
        } else if (data && !Array.isArray(data)) {
          setAboutUs(data);
        }
      } catch (err) {
        console.error('Error fetching about us:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutUs();
  }, []);

  const getMediaUrl = (path, file) => {
    if (file instanceof Blob) return URL.createObjectURL(file);
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    const baseUrl = process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
    let cleanPath = path;
    
    if (!cleanPath.startsWith('/media/') && !cleanPath.startsWith('media/')) {
      cleanPath = cleanPath.startsWith('/') ? `/media${cleanPath}` : `/media/${cleanPath}`;
    } else {
      cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    }
    
    return `${baseUrl}${cleanPath}`;
  };

  if (loading) return (
    <div className="body flex items-center justify-center min-h-screen bg-green-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin"></div>
        <p className="text-green-800 font-bold animate-pulse">Memuat Profil Barakah...</p>
      </div>
    </div>
  );

  return (
    <div className="body bg-[#f8fafc] min-h-screen">
      <Helmet>
        <title>{aboutUs?.title || 'Tentang Kami'} - Barakah Economy</title>
        <meta name="description" content={aboutUs?.description?.substring(0, 160)} />
      </Helmet>

      <Header />

      {/* Hero Section with Parallax Effect (Simulated) */}
      <div className="relative h-[40vh] md:h-[60vh] overflow-hidden">
        {aboutUs?.hero_image ? (
          <img 
            src={getMediaUrl(aboutUs.hero_image)} 
            alt="Hero" 
            className="w-full h-full object-cover transform scale-105 hover:scale-100 transition duration-[3s]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-800 to-green-600"></div>
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl">
            {aboutUs?.title || 'Tentang Kami'}
          </h1>
          <div className="w-24 h-1.5 bg-green-500 rounded-full shadow-lg"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10 pb-32">
        {/* Quick Back Button */}
        <Link to="/" className="absolute -top-16 left-4 md:left-0 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition border border-white/20">
          <span className="material-icons">arrow_back</span>
        </Link>

        {/* Dynamic Navigation Tabs */}
        <div className="bg-white/80 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 flex gap-2 mb-12 border border-white sticky top-24 z-30">
          {[
            { id: 'about', label: 'Profil Kami', icon: 'auto_awesome' },
            { id: 'vision', label: 'Visi & Misi', icon: 'explore' },
            { id: 'legal', label: 'Legalitas', icon: 'verified' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 rounded-[2rem] text-sm font-black transition flex items-center justify-center gap-3 ${
                activeTab === tab.id 
                ? 'bg-green-700 text-white shadow-xl shadow-green-200' 
                : 'text-gray-500 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <span className="material-icons text-xl">{tab.icon}</span>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="space-y-12">
          {activeTab === 'about' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-gray-200/40 border border-gray-50 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-50 rounded-full opacity-50 blur-3xl"></div>
                <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                  <span className="w-3 h-10 bg-green-600 rounded-full"></span>
                  Siapa Barakah Economy?
                </h2>
                <div className="text-lg text-gray-600 leading-relaxed space-y-6">
                  {aboutUs?.description ? (
                    <div className="whitespace-pre-line">{aboutUs.description}</div>
                  ) : (
                    <p>Memuat narasi organisasi...</p>
                  )}
                </div>
              </div>

              {aboutUs?.organization_structure_image && (
                <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-gray-200/40 border border-gray-50">
                  <h2 className="text-3xl font-black text-gray-900 mb-10 flex items-center gap-4 text-center justify-center">
                    Struktur Organisasi
                  </h2>
                  <div className="rounded-[2.5rem] overflow-hidden border-8 border-gray-50 shadow-inner group relative cursor-zoom-in"
                       onClick={() => window.open(getMediaUrl(aboutUs.organization_structure_image), '_blank')}>
                    <img 
                      src={getMediaUrl(aboutUs.organization_structure_image)} 
                      alt="Struktur" 
                      className="w-full h-auto transform transition duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-green-900/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="bg-white px-6 py-3 rounded-full text-sm font-black shadow-2xl">Lihat Detail Struktur</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vision' && (
            <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-[3rem] p-12 text-white shadow-2xl shadow-green-200 relative overflow-hidden">
                  <span className="material-icons absolute -bottom-10 -right-10 text-[180px] opacity-10">visibility</span>
                  <h3 className="text-2xl font-black mb-6">Visi Kami</h3>
                  <p className="text-xl leading-relaxed font-medium italic">
                    "{aboutUs?.vision || 'Mewujudkan ekosistem ekonomi barakah untuk umat.'}"
                  </p>
                </div>

                <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-gray-200/40 border border-gray-50 flex flex-col justify-center">
                  <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <span className="material-icons text-green-600">rocket_launch</span>
                    Misi Kami
                  </h3>
                  <div className="text-gray-600 text-lg leading-relaxed whitespace-pre-line">
                    {aboutUs?.mission}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12">
              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-gray-200/40 border border-gray-50 text-center">
                <h2 className="text-3xl font-black text-gray-900 mb-4">Legalitas & Transparansi</h2>
                <div className="w-20 h-1.5 bg-green-500 mx-auto rounded-full mb-8"></div>
                <p className="text-gray-600 max-w-2xl mx-auto mb-12">
                  {aboutUs?.legal_description || "Seluruh operasional Barakah Economy didukung oleh dokumen legalitas yang sah demi kenyamanan dan kepercayaan para anggota."}
                </p>

                {aboutUs?.legal_documents?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {aboutUs.legal_documents.map((doc) => (
                      <div key={doc.id} className="group relative aspect-[3/4] rounded-3xl overflow-hidden border-4 border-gray-50 shadow-sm hover:shadow-2xl transition duration-500">
                        <img 
                          src={getMediaUrl(doc.image)} 
                          alt={doc.title} 
                          className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                        />
                        <div 
                          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-6 cursor-pointer"
                          onClick={() => window.open(getMediaUrl(doc.image), '_blank')}
                        >
                          <p className="text-sm font-black text-white mb-1 uppercase tracking-widest">{doc.title}</p>
                          <p className="text-[10px] text-green-400 font-bold flex items-center gap-1 uppercase">
                            <span className="material-icons text-xs">zoom_in</span> Buka Dokumen
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <span className="material-icons text-6xl text-gray-300 mb-4">gavel</span>
                    <p className="text-gray-400 font-bold">Dokumen belum diunggah.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-gray-900 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-black text-white mb-6">Wujudkan Ekonomi Barakah Bersama Kami</h3>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">Bergabunglah dalam ekosistem ekonomi syariah terbesar untuk pemuda dan mahasiswa.</p>
            <Link to="/register" className="inline-flex items-center gap-3 px-10 py-5 bg-green-600 text-white rounded-[2rem] font-black hover:bg-green-700 transition transform hover:-translate-y-1 shadow-2xl shadow-green-900/40">
              Daftar Sekarang
              <span className="material-icons">east</span>
            </Link>
          </div>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default AboutUs;
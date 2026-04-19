// pages/AboutUs.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/Body.css';

const AboutUs = () => {
  const location = useLocation();
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

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
  };

  if (loading) return <div className="body flex items-center justify-center min-h-screen text-green-700">Loading profile data...</div>;

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Helmet>
        <title>Tentang Kami - Barakah Economy</title>
        <meta name="description" content="Tentang BAE Community" />
        <meta property="og:title" content="Tentang BAE Community" />
        <meta property="og:description" content="Tentang BAE Community" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <Header />

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-green-600 transition">
            <span className="material-icons text-xl">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Tentang Kami</h1>
        </div>

        {/* Hero Image */}
        {aboutUs?.hero_image && (
          <div className="w-full h-64 md:h-[450px] rounded-[3rem] overflow-hidden mb-12 shadow-2xl border-8 border-white bg-white group ring-1 ring-gray-100">
            <img src={getMediaUrl(aboutUs.hero_image)} alt="Barakah Economy" className="w-full h-full object-cover group-hover:scale-105 transition duration-[2s]" />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 flex gap-2 mb-8 sticky top-20 z-20 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'about' ? 'bg-green-700 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            <span className="material-icons text-sm">info</span>
            Profil
          </button>
          <button 
            onClick={() => setActiveTab('vision')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'vision' ? 'bg-green-700 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            <span className="material-icons text-sm">track_changes</span>
            Visi & Misi
          </button>
          <button 
            onClick={() => setActiveTab('legal')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'legal' ? 'bg-green-700 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            <span className="material-icons text-sm">verified_user</span>
            Bukti Legalitas
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'about' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-10 md:p-12 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
                  <span className="w-2.5 h-8 bg-green-600 rounded-full shadow-lg shadow-green-100"></span>
                  {aboutUs?.title || 'Profil BAE Community'}
                </h2>
                <div className="text-base text-gray-600 leading-relaxed whitespace-pre-line space-y-4">
                  {aboutUs?.description || `BAE Community berdiri pada tanggal 29 Februari 2024 di Jalan Tubagus Ismail Dalam No.19C dan bertempat di Dago, Kota Bandung, Jawa Barat. Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah islam dengan memberdayakan pemuda dan mahasiswa sebagai pionir perubahan.`}
                </div>
              </div>

              {aboutUs?.organization_structure_image && (
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-10 md:p-12 border border-gray-100">
                  <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-8 bg-blue-600 rounded-full shadow-lg shadow-blue-100"></span>
                    Struktur Organisasi
                  </h2>
                  <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 group relative">
                    <img 
                      src={getMediaUrl(aboutUs.organization_structure_image)} 
                      alt="Struktur Organisasi" 
                      className="w-full h-auto cursor-zoom-in transition duration-500"
                      onClick={() => window.open(getMediaUrl(aboutUs.organization_structure_image), '_blank')}
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                      <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-gray-800 shadow-lg">Klik untuk Perbesar</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vision' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-10 md:p-12 border border-gray-100">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 bg-green-100 rounded-[1.25rem] flex items-center justify-center text-green-700 shadow-inner">
                    <span className="material-icons text-3xl">visibility</span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">Visi Kami</h2>
                </div>
                <div className="relative text-lg text-gray-700 leading-relaxed bg-gradient-to-br from-green-50/50 to-white p-10 rounded-[2.5rem] border border-green-100/50 italic shadow-inner overflow-hidden">
                  <span className="material-icons absolute -top-4 -left-2 text-green-200 text-6xl opacity-30">format_quote</span>
                  <p className="relative z-10">
                    "{aboutUs?.vision || `Menjadi komunitas yang unggul dalam mengembangkan perekonomian berbasis syariah yang berkeadilan dan berkelanjutan, serta berkontribusi secara aktif dalam kesejahteraan umat`}"
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-10 md:p-12 border border-gray-100">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 bg-blue-100 rounded-[1.25rem] flex items-center justify-center text-blue-700 shadow-inner">
                    <span className="material-icons text-3xl">rocket_launch</span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">Misi Kami</h2>
                </div>
                <div className="text-base text-gray-600 leading-relaxed">
                  {aboutUs?.mission ? (
                    <div className="whitespace-pre-line space-y-4">{aboutUs.mission}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        'Mendorong Pemberdayaan Ekonomi',
                        'Pendidikan dan Literasi Keuangan Syariah',
                        'Kolaborasi dan Sinergi Antar Komunitas',
                        'Pengembangan Usaha Berbasis Syariah',
                        'Kepedulian Sosial dan Amal'
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-5 p-6 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-green-200 transition-all group">
                          <span className="shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-black group-hover:bg-green-600 group-hover:text-white transition-colors">{index + 1}</span>
                          <span className="font-bold text-gray-800 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
                  Bukti Legalitas & Dokumen
                </h2>
                {aboutUs?.legal_documents?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 md:gap-8">
                    {aboutUs?.legal_description && (
                      <div className="col-span-full bg-green-50/50 p-6 rounded-3xl border border-green-100 mb-4">
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                          {aboutUs.legal_description}
                        </p>
                      </div>
                    )}
                    {aboutUs.legal_documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="group relative aspect-[4/5] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                      >
                        <img 
                          src={getMediaUrl(doc.image)} 
                          alt={doc.title} 
                          className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                        />
                        {/* Overlay with info revealed on hover */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 cursor-pointer"
                          onClick={() => window.open(getMediaUrl(doc.image), '_blank')}
                        >
                          <p className="text-[10px] font-black text-white uppercase tracking-wider mb-1 drop-shadow-md">{doc.title}</p>
                          <div className="flex items-center gap-1 text-white/80 text-[8px] font-bold">
                            <span className="material-icons text-[10px]">visibility</span>
                            KLIK UNTUK LIHAT PENUH
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <span className="material-icons text-6xl text-gray-200 mb-4">description</span>
                    <h3 className="text-lg font-bold text-gray-400">Belum Ada Dokumen</h3>
                    <p className="text-xs text-gray-400 max-w-xs mt-2">Dokumen legalitas dan sertifikat pendukung akan segera ditampilkan di sini.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-green-500/20 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2">Ingin tahu lebih lanjut?</h3>
              <p className="text-gray-400 text-sm">Hubungi kami untuk kolaborasi atau informasi lebih lanjut seputar BAE Community.</p>
            </div>
            <Link to="/hubungi-kami" className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold text-sm hover:bg-green-50 transition shadow-xl whitespace-nowrap">
              Hubungi Kami
            </Link>
          </div>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default AboutUs;
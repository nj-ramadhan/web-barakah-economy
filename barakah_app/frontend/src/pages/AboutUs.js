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

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-20">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-green-600 transition">
            <span className="material-icons text-xl">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Tentang Kami</h1>
        </div>

        {/* Hero Image */}
        {aboutUs?.hero_image && (
          <div className="w-full h-56 md:h-80 rounded-[2.5rem] overflow-hidden mb-8 shadow-xl border-4 border-white bg-white">
            <img src={getMediaUrl(aboutUs.hero_image)} alt="Barakah Economy" className="w-full h-full object-cover" />
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
              <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-2 h-6 bg-green-600 rounded-full"></span>
                  {aboutUs?.title || 'Profil BAE Community'}
                </h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line space-y-4">
                  {aboutUs?.description || `BAE Community berdiri pada tanggal 29 Februari 2024 di Jalan Tubagus Ismail Dalam No.19C dan bertempat di Dago, Kota Bandung, Jawa Barat. Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah islam dengan memberdayakan pemuda dan mahasiswa sebagai pionir perubahan.`}
                </div>
              </div>

              {aboutUs?.organization_structure_image && (
                <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100">
                  <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                    Struktur Organisasi
                  </h2>
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                    <img 
                      src={getMediaUrl(aboutUs.organization_structure_image)} 
                      alt="Struktur Organisasi" 
                      className="w-full h-auto cursor-zoom-in"
                      onClick={() => window.open(getMediaUrl(aboutUs.organization_structure_image), '_blank')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vision' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-700">
                    <span className="material-icons">visibility</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900">Visi Kami</h2>
                </div>
                <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100 italic">
                  "{aboutUs?.vision || `Menjadi komunitas yang unggul dalam mengembangkan perekonomian berbasis syariah yang berkeadilan dan berkelanjutan, serta berkontribusi secara aktif dalam kesejahteraan umat`}"
                </div>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700">
                    <span className="material-icons">rocket_launch</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900">Misi Kami</h2>
                </div>
                <div className="text-sm text-gray-600 leading-relaxed space-y-4">
                  {aboutUs?.mission ? (
                    <div className="whitespace-pre-line">{aboutUs.mission}</div>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Mendorong Pemberdayaan Ekonomi',
                        'Pendidikan dan Literasi Keuangan Syariah',
                        'Kolaborasi dan Sinergi Antar Komunitas',
                        'Pengembangan Usaha Berbasis Syariah',
                        'Kepedulian Sosial dan Amal'
                      ].map((item, index) => (
                        <li key={index} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                          <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                          <span className="font-bold text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {aboutUs?.legal_description && (
                      <div className="col-span-full bg-green-50/50 p-6 rounded-3xl border border-green-100 mb-4">
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                          {aboutUs.legal_description}
                        </p>
                      </div>
                    )}
                    {aboutUs.legal_documents.map((doc) => (
                      <div key={doc.id} className="group bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-purple-200 transition-all shadow-sm">
                        <div className="relative h-48 overflow-hidden bg-white">
                          <img 
                            src={getMediaUrl(doc.image)} 
                            alt={doc.title} 
                            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => window.open(getMediaUrl(doc.image), '_blank')}
                          />
                          <div 
                            className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onClick={() => window.open(getMediaUrl(doc.image), '_blank')}
                          >
                            <span className="material-icons text-white bg-purple-600 p-2 rounded-full shadow-lg">visibility</span>
                          </div>
                        </div>
                        <div className="p-4 bg-white border-t border-gray-50">
                          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">{doc.title}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Unggahan: {new Date(doc.created_at).toLocaleDateString('id-ID')}</p>
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
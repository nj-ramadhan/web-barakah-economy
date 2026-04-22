// pages/AboutUs.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';
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
    
    // Extract origin from API URL (e.g. https://domain.com/api -> https://domain.com)
    const baseUrl = process.env.REACT_APP_API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    
    let cleanPath = path;
    if (cleanPath.startsWith('/media/') || cleanPath.startsWith('media/')) {
      cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    } else {
      cleanPath = cleanPath.startsWith('/') ? `/media${cleanPath}` : `/media/${cleanPath}`;
    }
    
    return `${baseUrl}${cleanPath}`;
  };

  // Hierarchy Tree Logic
  const buildTree = (records) => {
    if (!records) return [];
    const map = {};
    const roots = [];
    const sorted = [...records].sort((a, b) => 
      a.hierarchy_code.localeCompare(b.hierarchy_code, undefined, { numeric: true, sensitivity: 'base' })
    );

    sorted.forEach(val => {
      map[val.hierarchy_code] = { ...val, children: [] };
      const parts = val.hierarchy_code.split('.');
      if (parts.length === 1) {
        roots.push(map[val.hierarchy_code]);
      } else {
        const parentKey = parts.slice(0, -1).join('.');
        if (map[parentKey]) {
          map[parentKey].children.push(map[val.hierarchy_code]);
        } else {
          roots.push(map[val.hierarchy_code]);
        }
      }
    });
    return roots;
  };

  const treeData = buildTree(aboutUs?.personnel);

  const PersonnelCard = ({ person }) => (
    <div className="flex flex-col items-center group">
      <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 w-full max-w-[280px] text-center relative hover:shadow-2xl transition duration-500 transform hover:-translate-y-2">
        <div className="w-24 h-24 md:w-32 md:w-32 rounded-[2rem] overflow-hidden mx-auto mb-6 shadow-2xl border-4 border-white ring-8 ring-gray-50/50 group-hover:ring-green-50 transition-all">
          <img src={getMediaUrl(person.image)} alt={person.name} className="w-full h-full object-cover" />
        </div>
        <h4 className="text-lg md:text-xl font-black text-gray-900 mb-1 leading-tight">{person.name}</h4>
        <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-4">{person.job_title}</p>
        
        {person.social_media?.length > 0 && (
          <div className="flex justify-center gap-3 mt-2 pt-4 border-t border-gray-50">
            {person.social_media.map((sm, i) => (
              <a key={i} href={sm.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-600 transition transform hover:scale-125">
                <span className={`material-icons text-lg ${sm.icon === 'language' ? 'material-icons-outlined' : ''}`}>
                  {sm.icon === 'twitter' ? 'close' : (sm.icon === 'website' ? 'language' : sm.icon)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
      
      {person.children?.length > 0 && (
        <div className="relative pt-12 w-full flex flex-col items-center">
          {/* Stem Line */}
          <div className="absolute top-0 w-0.5 h-12 bg-green-200"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 relative">
             {/* Branch Line for Multiple Children */}
             {person.children.length > 1 && (
               <div className="hidden md:block absolute top-0 left-12 right-12 h-0.5 bg-green-200"></div>
             )}
             {person.children.map(child => (
               <div key={child.id} className="relative pt-6">
                  {/* Small connector Line */}
                  <div className="hidden md:block absolute top-[-24px] left-1/2 w-0.5 h-6 bg-green-200"></div>
                  <PersonnelCard person={child} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div className="body flex items-center justify-center min-h-screen bg-green-50">
      <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="body bg-[#fcfdfe] min-h-screen">
      <Helmet>
        <title>{aboutUs?.title || 'Tentang Kami'} - Barakah Economy</title>
        <meta name="description" content={aboutUs?.description?.substring(0, 160)} />
      </Helmet>

      <Header />

      {/* Hero Section */}
      <div className="relative h-[45vh] md:h-[65vh] overflow-hidden">
        {aboutUs?.hero_image ? (
          <img 
            src={getMediaUrl(aboutUs.hero_image)} 
            alt="Hero" 
            className="w-full h-full object-cover transform scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-900 to-green-700"></div>
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-7xl font-black text-white mb-6 drop-shadow-2xl">
            {aboutUs?.title || 'Tentang Kami'}
          </h1>
          <div className="w-32 h-2 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-10 pb-40">
        <Link to="/" className="absolute -top-16 left-4 md:left-0 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white hover:bg-white/40 transition border border-white/30">
          <span className="material-icons">arrow_back</span>
        </Link>

        {/* Improved Tabs UI */}
        <div className="bg-white/90 backdrop-blur-2xl p-2 rounded-[2.5rem] shadow-2xl shadow-gray-300/40 flex flex-wrap gap-2 mb-16 border border-white sticky top-24 z-30">
          {[
            { id: 'about', label: 'Profil Kami', icon: 'auto_awesome' },
            { id: 'team', label: 'Struktur Team', icon: 'account_tree' },
            { id: 'vision', label: 'Visi & Misi', icon: 'explore' },
            { id: 'legal', label: 'Legalitas', icon: 'verified' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 rounded-[2rem] text-sm font-black transition flex items-center justify-center gap-3 min-w-[140px] ${
                activeTab === tab.id 
                ? 'bg-green-700 text-white shadow-xl shadow-green-100' 
                : 'text-gray-500 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <span className="material-icons text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-20">
          {activeTab === 'about' && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white rounded-[4rem] p-12 md:p-20 shadow-2xl shadow-gray-200/30 border border-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-green-50 rounded-full -mr-48 -mt-48 opacity-50 blur-3xl"></div>
                <h2 className="text-4xl font-black text-gray-900 mb-10 flex items-center gap-4">
                  <span className="w-4 h-12 bg-green-600 rounded-full"></span>
                  Eksistensi Barakah Economy
                </h2>
                <div className="text-xl text-gray-600 leading-relaxed space-y-8 max-w-4xl">
                  {aboutUs?.description ? (
                    <div className="whitespace-pre-line">{aboutUs.description}</div>
                  ) : (
                    <p className="animate-pulse">Menghubungkan data...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-gray-900">Struktur Organisasi</h2>
                <p className="text-gray-500 font-bold max-w-2xl mx-auto uppercase tracking-widest text-xs">Sinergi Pemuda untuk Ekonomi Barakah</p>
              </div>

              {/* Personnel Tree Rendering */}
              <div className="overflow-x-auto pb-20 -mx-4 px-4 scrollbar-hide">
                <div className="min-w-fit flex flex-col items-center">
                   {treeData.map(root => (
                     <PersonnelCard key={root.id} person={root} />
                   ))}
                </div>
              </div>

              {/* Fallback Structure Image */}
              {aboutUs?.organization_structure_image && (
                 <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-xl shadow-gray-200/30 border border-gray-50 text-center">
                    <h3 className="text-xl font-black text-gray-400 mb-12 uppercase tracking-[0.3em]">Full Chart View</h3>
                    <div className="rounded-[2.5rem] overflow-hidden border-8 border-gray-50 shadow-inner cursor-zoom-in" onClick={() => window.open(getMediaUrl(aboutUs.organization_structure_image), '_blank')}>
                      <img src={getMediaUrl(aboutUs.organization_structure_image)} className="w-full h-auto" alt="Full Chart"/>
                    </div>
                 </div>
              )}
            </div>
          )}

          {activeTab === 'vision' && (
            <div className="grid md:grid-cols-2 gap-10 animate-in zoom-in-95 duration-500">
                <div className="bg-gradient-to-br from-green-800 to-green-950 rounded-[4rem] p-16 text-white shadow-2xl shadow-green-100 flex flex-col justify-center relative overflow-hidden">
                  <span className="material-icons absolute -bottom-10 -left-10 text-[240px] opacity-10">center_focus_strong</span>
                  <h3 className="text-3xl font-black mb-10 flex items-center gap-4">
                    Visi
                    <div className="flex-1 h-0.5 bg-white/20"></div>
                  </h3>
                  <p className="text-3xl leading-[1.4] font-black italic">
                    "{aboutUs?.vision || 'Membumikan Ekonomi Syariah.'}"
                  </p>
                </div>

                <div className="bg-white rounded-[4rem] p-16 shadow-2xl shadow-gray-200/30 border border-gray-100">
                  <h3 className="text-3xl font-black text-gray-900 mb-10 flex items-center gap-4">
                    <span className="material-icons text-green-600 text-4xl">rocket_launch</span>
                    Misi Kami
                  </h3>
                  <div className="text-gray-600 text-xl leading-relaxed whitespace-pre-line font-medium">
                    {aboutUs?.mission}
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="animate-in fade-in slide-in-from-right-10 duration-700">
              <div className="bg-white rounded-[4rem] p-12 md:p-20 shadow-2xl shadow-gray-200/30 border border-gray-50">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-black text-gray-900 mb-6">Legalitas Organisasi</h2>
                  <p className="text-gray-500 text-lg max-w-3xl mx-auto leading-relaxed">
                    {aboutUs?.legal_description || "Memastikan transparansi dan kepatuhan hukum dalam setiap langkah perjuangan kita."}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {aboutUs?.legal_documents?.map((doc) => (
                    <div key={doc.id} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden border-4 border-gray-50 hover:shadow-2xl transition duration-700 cursor-zoom-in" onClick={() => window.open(getMediaUrl(doc.image), '_blank')}>
                      <img src={getMediaUrl(doc.image)} alt={doc.title} className="w-full h-full object-cover transition-all group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-green-950/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-8">
                        <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1 italic">Click to view</p>
                        <p className="text-sm font-black text-white uppercase">{doc.title}</p>
                      </div>
                    </div>
                  ))}
                  {(!aboutUs?.legal_documents || aboutUs.legal_documents.length === 0) && (
                    <div className="col-span-full py-32 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center opacity-50">
                      <span className="material-icons text-7xl mb-4">folder_off</span>
                      <p className="font-black uppercase tracking-widest text-sm">Dokumen Belum Tersedia</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Final CTA */}
        <div className="mt-32 bg-gray-950 rounded-[5rem] p-16 md:p-24 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-green-500/30 transition duration-1000"></div>
          
          <div className="relative z-10 space-y-12">
            <h3 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Jadi Bagian dari <br/> <span className="text-green-500">Ekosistem Keberkahan</span>
            </h3>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">Saatnya pemuda mengambil peran dalam transformasi ekonomi syariah yang transparan dan profesional.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/register" className="px-12 py-6 bg-white text-gray-900 rounded-[2.5rem] font-black text-lg hover:bg-green-500 hover:text-white transition transform hover:-translate-y-2 shadow-2xl">
                Bergabung Sekarang
              </Link>
              <Link to="/hubungi-kami" className="px-12 py-6 bg-white/10 text-white border border-white/20 rounded-[2.5rem] font-black text-lg backdrop-blur hover:bg-white/20 transition">
                Konsultasi Dulu
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <NavigationButton />
    </div>
  );
};

export default AboutUs;
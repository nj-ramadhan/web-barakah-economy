import React, { useState, useEffect, useRef } from 'react';
import { getBibSettings, updateBibSettings } from '../../services/eventApi';

const BibEditor = ({ slug }) => {
    const [settings, setSettings] = useState({
        number_x: 50,
        number_y: 50,
        number_font_size: 150,
        number_color: '#000000',
        name_x: 50,
        name_y: 80,
        name_font_size: 40,
        name_color: '#000000',
        number_format: '001',
        is_active: true,
        show_photo: false,
        photo_x: 50,
        photo_y: 30,
        photo_width: 20,
        photo_height: 25
    });
    const [template, setTemplate] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const imageRef = useRef(null);

    useEffect(() => {
        fetchSettings();
    }, [slug]);

    const fetchSettings = async () => {
        try {
            const response = await getBibSettings(slug);
            if (response.data) {
                setSettings({
                    ...settings,
                    ...response.data
                });
                if (response.data.template_image) {
                    setPreviewUrl(response.data.template_image);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching BIB settings", error);
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTemplate(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleDrag = (e, type) => {
        e.preventDefault();
        const rect = imageRef.current.getBoundingClientRect();
        
        const onMouseMove = (moveEvent) => {
            let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            if (type === 'number') {
                setSettings(prev => ({ ...prev, number_x: x, number_y: y }));
            } else if (type === 'name') {
                setSettings(prev => ({ ...prev, name_x: x, name_y: y }));
            } else if (type === 'photo') {
                setSettings(prev => ({ ...prev, photo_x: x, photo_y: y }));
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleSave = async () => {
        const formData = new FormData();
        if (template) formData.append('template_image', template);
        
        Object.keys(settings).forEach(key => {
            if (key !== 'template_image' && settings[key] !== null) {
                formData.append(key, settings[key]);
            }
        });

        try {
            await updateBibSettings(slug, formData);
            alert("Pengaturan BIB berhasil disimpan!");
        } catch (error) {
            console.error("Save error", error);
            alert("Gagal menyimpan pengaturan.");
        }
    };

    const getPreviewFontSize = (baseSize) => {
        if (!imageRef.current) return baseSize / 2;
        const rect = imageRef.current.getBoundingClientRect();
        // Base normalization: assume 1000px height for font scale
        return (baseSize / 1000) * rect.height;
    };

    if (loading) return <div className="p-4 text-center">Memuat pengaturan...</div>;

    return (
        <div className="bib-editor bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Editor No Punggung (BIB)</h3>
                    <p className="text-xs text-gray-500 mt-1">Geser nomor dan nama peserta ke posisi yang diinginkan pada desain Anda.</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl">
                    <span className="text-sm font-bold text-gray-600">Status Aktif</span>
                    <button 
                        onClick={() => setSettings({...settings, is_active: !settings.is_active})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.is_active ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Preview Section */}
                <div className="xl:col-span-3">
                    <div 
                        className="relative border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden bg-gray-100 flex items-center justify-center p-4 min-h-[500px]"
                        style={{ userSelect: 'none' }}
                    >
                        {previewUrl ? (
                            <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden">
                                <img 
                                    ref={imageRef}
                                    src={previewUrl} 
                                    alt="BIB Template" 
                                    className="max-w-full h-auto block" 
                                />

                                {/* BIB Number Placeholder */}
                                <div 
                                    className="absolute cursor-move whitespace-nowrap flex items-center justify-center select-none"
                                    style={{ 
                                        left: `${settings.number_x}%`, 
                                        top: `${settings.number_y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: `${getPreviewFontSize(settings.number_font_size)}px`,
                                        color: settings.number_color,
                                        fontWeight: '900',
                                        lineHeight: 1,
                                        textShadow: '0 0 4px rgba(255,255,255,0.5)'
                                    }}
                                    onMouseDown={(e) => handleDrag(e, 'number')}
                                >
                                    {settings.number_format.replace(/[0-9]/g, '0')}
                                </div>

                                {/* Participant Name Placeholder */}
                                <div 
                                    className="absolute cursor-move whitespace-nowrap flex items-center justify-center select-none"
                                    style={{ 
                                        left: `${settings.name_x}%`, 
                                        top: `${settings.name_y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: `${getPreviewFontSize(settings.name_font_size)}px`,
                                        color: settings.name_color,
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}
                                    onMouseDown={(e) => handleDrag(e, 'name')}
                                >
                                    NAMA PESERTA
                                </div>

                                {/* Participant Photo Placeholder */}
                                {settings.show_photo && (
                                    <div 
                                        className="absolute cursor-move border-4 border-dashed border-blue-400 bg-blue-50/50 flex items-center justify-center select-none overflow-hidden"
                                        style={{ 
                                            left: `${settings.photo_x}%`, 
                                            top: `${settings.photo_y}%`,
                                            width: `${settings.photo_width}%`,
                                            height: `${settings.photo_height}%`,
                                            transform: 'translate(-50%, -50%)',
                                            borderRadius: '10%'
                                        }}
                                        onMouseDown={(e) => handleDrag(e, 'photo')}
                                    >
                                        <div className="flex flex-col items-center justify-center text-blue-500">
                                            <span className="material-icons" style={{ fontSize: '2vw' }}>account_box</span>
                                            <span className="text-[0.6vw] font-black uppercase mt-1">FOTO</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center p-12">
                                <span className="material-icons text-7xl text-gray-200 mb-4 block">image</span>
                                <p className="text-gray-400 font-bold">Unggah desain BIB (tanpa nomor & nama) untuk memulai.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Section */}
                <div className="space-y-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 h-fit">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. Desain BIB</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="bib-upload" />
                        <label htmlFor="bib-upload" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 transition shadow-sm">
                            <span className="material-icons text-blue-500">cloud_upload</span>
                            <span className="text-xs font-bold text-gray-600 truncate">{template ? template.name : 'Pilih Gambar...'}</span>
                        </label>
                    </div>

                    <hr className="border-gray-200" />

                    <div className="space-y-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Konfigurasi Nomor</label>
                        
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Format Nomor</label>
                            <select 
                                value={settings.number_format}
                                onChange={(e) => setSettings({...settings, number_format: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                            >
                                <option value="1">1 (Tanpa Nol)</option>
                                <option value="01">01 (2 Digit)</option>
                                <option value="001">001 (3 Digit)</option>
                                <option value="0001">0001 (4 Digit)</option>
                                <option value="00001">00001 (5 Digit)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Ukuran & Warna Nomor</label>
                            <div className="flex gap-2">
                                <input type="number" value={settings.number_font_size} onChange={(e) => setSettings({...settings, number_font_size: parseInt(e.target.value) || 10})} className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-center" />
                                <input type="color" value={settings.number_color} onChange={(e) => setSettings({...settings, number_color: e.target.value})} className="h-10 w-14 border-0 p-0 bg-transparent cursor-pointer rounded-lg" />
                                <input type="text" value={settings.number_color.toUpperCase()} onChange={(e) => setSettings({...settings, number_color: e.target.value})} className="flex-grow border border-gray-200 rounded-xl px-3 text-[10px] font-mono font-bold" />
                            </div>
                        </div>

                        <hr className="border-gray-200" />
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">3. Konfigurasi Nama</label>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Ukuran & Warna Nama</label>
                            <div className="flex gap-2">
                                <input type="number" value={settings.name_font_size} onChange={(e) => setSettings({...settings, name_font_size: parseInt(e.target.value) || 10})} className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-center" />
                                <input type="color" value={settings.name_color} onChange={(e) => setSettings({...settings, name_color: e.target.value})} className="h-10 w-14 border-0 p-0 bg-transparent cursor-pointer rounded-lg" />
                                <input type="text" value={settings.name_color.toUpperCase()} onChange={(e) => setSettings({...settings, name_color: e.target.value})} className="flex-grow border border-gray-200 rounded-xl px-3 text-[10px] font-mono font-bold" />
                            </div>
                        </div>

                        <hr className="border-gray-200" />
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">4. Foto Peserta</label>
                            <button 
                                type="button"
                                onClick={() => setSettings({...settings, show_photo: !settings.show_photo})}
                                className={`w-8 h-4 rounded-full transition-colors relative ${settings.show_photo ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.show_photo ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>

                        {settings.show_photo && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Lebar Foto (%)</label>
                                    <input type="range" min="5" max="80" value={settings.photo_width} onChange={(e) => setSettings({...settings, photo_width: parseFloat(e.target.value)})} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Tinggi Foto (%)</label>
                                    <input type="range" min="5" max="80" value={settings.photo_height} onChange={(e) => setSettings({...settings, photo_height: parseFloat(e.target.value)})} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button onClick={handleSave} disabled={!previewUrl} className={`w-full font-black py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!previewUrl ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            <span className="material-icons text-base">save</span>
                            <span className="text-[11px] uppercase tracking-widest">Simpan Pengaturan BIB</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BibEditor;

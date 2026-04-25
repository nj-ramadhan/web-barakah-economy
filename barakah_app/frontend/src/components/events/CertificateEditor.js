import React, { useState, useEffect, useRef } from 'react';
import { getCertificateSettings, updateCertificateSettings } from '../../services/eventApi';

const CertificateEditor = ({ slug }) => {
    const [settings, setSettings] = useState({
        name_x: 10,
        name_y: 45,
        name_width: 80,
        name_height: 10,
        font_size: 60,
        font_color: '#000000',
        font_family: 'Roboto-Bold.ttf',
        font_bold: true,
        font_italic: false,
        text_align: 'center',
        show_unique_code: false,
        code_x: 10,
        code_y: 90,
        code_font_size: 30,
        is_active: true
    });
    const [template, setTemplate] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const imageRef = useRef(null);

    // Font mapping for preview and display
    const FONT_OPTIONS = [
        { label: 'Roboto', value: 'Roboto-Bold.ttf', css: "'Roboto', sans-serif" },
        { label: 'Classic Serif', value: 'PlayfairDisplay-Bold.ttf', css: "'Playfair Display', serif" },
        { label: 'Montserrat', value: 'Montserrat-SemiBold.ttf', css: "'Montserrat', sans-serif" },
        { label: 'Tulisan Sambung (Great Vibes)', value: 'GreatVibes-Regular.ttf', css: "'Great Vibes', cursive" },
        { label: 'Modern Script (Dancing Script)', value: 'DancingScript-Bold.ttf', css: "'Dancing Script', cursive" },
    ];

    useEffect(() => {
        fetchSettings();
        // Load fonts for preview
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, [slug]);

    const fetchSettings = async () => {
        try {
            const response = await getCertificateSettings(slug);
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
            console.error("Error fetching cert settings", error);
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

    const handleDrag = (e, type = 'name') => {
        e.preventDefault();
        const rect = imageRef.current.getBoundingClientRect();
        
        const onMouseMove = (moveEvent) => {
            let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            if (type === 'name') {
                setSettings(prev => ({ ...prev, name_x: x, name_y: y }));
            } else {
                setSettings(prev => ({ ...prev, code_x: x, code_y: y }));
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = imageRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = settings.name_width;
        const startHeight = settings.name_height;

        const onMouseMove = (moveEvent) => {
            const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
            const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;

            setSettings(prev => ({
                ...prev,
                name_width: Math.max(5, Math.min(100 - prev.name_x, startWidth + deltaX)),
                name_height: Math.max(2, Math.min(100 - prev.name_y, startHeight + deltaY))
            }));
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
            if (key !== 'template_image') {
                formData.append(key, settings[key]);
            }
        });

        try {
            await updateCertificateSettings(slug, formData);
            alert("Pengaturan sertifikat berhasil disimpan!");
        } catch (error) {
            console.error("Save error", error);
            alert("Gagal menyimpan pengaturan.");
        }
    };

    const getPreviewFontSize = (baseSize) => {
        if (!imageRef.current) return baseSize / 2;
        const rect = imageRef.current.getBoundingClientRect();
        return (baseSize / 1000) * rect.height;
    };

    const getCurrentFontCss = () => {
        const font = FONT_OPTIONS.find(f => f.value === settings.font_family);
        return font ? font.css : 'sans-serif';
    };

    if (loading) return <div className="p-4 text-center">Memuat pengaturan...</div>;

    return (
        <div className="certificate-editor bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Editor Sertifikat Pro</h3>
                    <p className="text-xs text-gray-500 mt-1">Live preview dengan pilihan font estetik dan gaya teks.</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl">
                    <span className="text-sm font-bold text-gray-600">Status Aktif</span>
                    <button 
                        onClick={() => setSettings({...settings, is_active: !settings.is_active})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.is_active ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Preview Section */}
                <div className="xl:col-span-3">
                    <div 
                        className="relative border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden bg-gray-100 flex items-center justify-center p-4 min-h-[600px]"
                        style={{ userSelect: 'none' }}
                    >
                        {previewUrl ? (
                            <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden">
                                <img 
                                    ref={imageRef}
                                    src={previewUrl} 
                                    alt="Template" 
                                    className="max-w-full h-auto block" 
                                />

                                {/* Name Bounding Box */}
                                <div 
                                    className="absolute bg-blue-500 bg-opacity-5 border-2 border-blue-500 border-dashed cursor-move overflow-hidden flex"
                                    style={{ 
                                        left: `${settings.name_x}%`, 
                                        top: `${settings.name_y}%`,
                                        width: `${settings.name_width}%`,
                                        height: `${settings.name_height}%`,
                                        justifyContent: settings.text_align === 'center' ? 'center' : (settings.text_align === 'right' ? 'flex-end' : 'flex-start'),
                                        alignItems: 'center'
                                    }}
                                    onMouseDown={(e) => handleDrag(e, 'name')}
                                >
                                    <div 
                                        className="px-2 leading-tight transition-all duration-200"
                                        style={{ 
                                            fontSize: `${getPreviewFontSize(settings.font_size)}px`,
                                            color: settings.font_color,
                                            fontWeight: settings.font_bold ? 'bold' : 'normal',
                                            fontStyle: settings.font_italic ? 'italic' : 'normal',
                                            fontFamily: getCurrentFontCss(),
                                            textAlign: settings.text_align,
                                            width: '100%'
                                        }}
                                    >
                                        Nama Lengkap Peserta Disini
                                    </div>

                                    {/* Resizer Handle */}
                                    <div 
                                        className="absolute right-0 bottom-0 w-6 h-6 bg-blue-600 flex items-center justify-center cursor-nwse-resize z-10"
                                        onMouseDown={handleResize}
                                    >
                                        <span className="material-icons text-white text-sm">open_in_full</span>
                                    </div>
                                </div>

                                {/* Unique Code Placeholder */}
                                {settings.show_unique_code && (
                                    <div 
                                        className="absolute bg-green-500 bg-opacity-10 border border-green-500 border-dashed px-2 py-0.5 cursor-move whitespace-nowrap flex items-center justify-center"
                                        style={{ 
                                            left: `${settings.code_x}%`, 
                                            top: `${settings.code_y}%`,
                                            fontSize: `${getPreviewFontSize(settings.code_font_size)}px`,
                                            color: settings.font_color,
                                            fontFamily: 'monospace'
                                        }}
                                        onMouseDown={(e) => handleDrag(e, 'code')}
                                    >
                                        ID: BAE-XXXXX
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center p-12">
                                <span className="material-icons text-7xl text-gray-200 mb-4 block">image</span>
                                <p className="text-gray-400 font-bold">Unggah gambar sertifikat untuk memulai.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Section */}
                <div className="space-y-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 h-fit">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. Gambar Template</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="cert-upload" />
                        <label htmlFor="cert-upload" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 transition shadow-sm">
                            <span className="material-icons text-blue-500">cloud_upload</span>
                            <span className="text-xs font-bold text-gray-600 truncate">{template ? template.name : 'Pilih Gambar...'}</span>
                        </label>
                    </div>

                    <hr className="border-gray-200" />

                    <div className="space-y-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Gaya Teks Nama</label>
                        
                        {/* Font Family Dropdown */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Pilih Font</label>
                            <select 
                                value={settings.font_family}
                                onChange={(e) => setSettings({...settings, font_family: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                style={{ fontFamily: getCurrentFontCss() }}
                            >
                                {FONT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} style={{ fontFamily: opt.css }}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Bold & Italic Toggles */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSettings({...settings, font_bold: !settings.font_bold})}
                                className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${settings.font_bold ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-sm">format_bold</span>
                                <span className="text-[10px] font-black uppercase">Bold</span>
                            </button>
                            <button 
                                onClick={() => setSettings({...settings, font_italic: !settings.font_italic})}
                                className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${settings.font_italic ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-sm">format_italic</span>
                                <span className="text-[10px] font-black uppercase">Italic</span>
                            </button>
                        </div>

                        {/* Font Size */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Ukuran Font</label>
                                <input type="range" min="10" max="300" value={settings.font_size} 
                                    onChange={(e) => setSettings({...settings, font_size: parseInt(e.target.value)})}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="pt-5">
                                <input type="number" value={settings.font_size}
                                    onChange={(e) => setSettings({...settings, font_size: parseInt(e.target.value) || 10})}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-center" />
                            </div>
                        </div>

                        {/* Alignment */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Perataan</label>
                            <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                                {['left', 'center', 'right'].map(align => (
                                    <button 
                                        key={align}
                                        onClick={() => setSettings({...settings, text_align: align})}
                                        className={`flex-1 py-2 rounded-lg transition-all ${settings.text_align === align ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                        <span className="material-icons text-sm">
                                            {align === 'left' ? 'format_align_left' : (align === 'center' ? 'format_align_center' : 'format_align_right')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase">Warna Teks</label>
                            <div className="flex gap-2">
                                <input type="color" value={settings.font_color} onChange={(e) => setSettings({...settings, font_color: e.target.value})} className="h-10 w-14 border-0 p-0 bg-transparent cursor-pointer rounded-lg shadow-inner" />
                                <input type="text" value={settings.font_color.toUpperCase()} onChange={(e) => setSettings({...settings, font_color: e.target.value})} className="flex-grow border border-gray-200 rounded-xl px-4 text-xs font-mono font-bold" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button onClick={handleSave} disabled={!previewUrl} className={`w-full font-black py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!previewUrl ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200'}`}>
                            <span className="material-icons text-base">verified</span>
                            <span className="text-[11px] uppercase tracking-widest">Simpan Pengaturan</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateEditor;

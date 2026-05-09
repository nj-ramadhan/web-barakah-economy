import React, { useState, useEffect, useRef } from 'react';
import { getSpecialQRSettings, updateSpecialQRSettings, getEventDetail, regenerateQRImages } from '../../services/eventApi';

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBaseUrl}${cleanPath}`;
};

const FONT_OPTIONS = [
    { label: 'Roboto (Default)', value: 'Roboto-Bold.ttf', css: 'sans-serif' },
    { label: 'Montserrat', value: 'Montserrat-SemiBold.ttf', css: "'Montserrat', sans-serif" },
    { label: 'Open Sans', value: 'OpenSans-Bold.ttf', css: "'Open Sans', sans-serif" },
    { label: 'Poppins', value: 'Poppins-Bold.ttf', css: "'Poppins', sans-serif" },
    { label: 'Great Vibes (Script)', value: 'GreatVibes-Regular.ttf', css: "'Great Vibes', cursive" },
    { label: 'Dancing Script', value: 'DancingScript-Bold.ttf', css: "'Dancing Script', cursive" },
    { label: 'Playfair Display', value: 'PlayfairDisplay-Bold.ttf', css: "serif" },
];

const getFontCss = (value) => {
    const option = FONT_OPTIONS.find(o => o.value === value);
    return option ? option.css : 'sans-serif';
};

const SpecialQREditor = ({ slug }) => {
    const [event, setEvent] = useState(null);
    const [settings, setSettings] = useState({
        code_type: 'qr',
        code_x: 50,
        code_y: 50,
        code_width: 20,
        code_height: 20,
        field_layouts: [],
        is_active: true
    });

    const [template, setTemplate] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imageLoaded, setImageLoaded] = useState(false);
    const imageRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, [slug]);

    const fetchData = async () => {
        try {
            const eventRes = await getEventDetail(slug);
            setEvent(eventRes.data);

            const response = await getSpecialQRSettings(slug);
            if (response.data) {
                setSettings({
                    ...settings,
                    ...response.data,
                    field_layouts: response.data.field_layouts || []
                });
                if (response.data.template_image) {
                    setPreviewUrl(getImageUrl(response.data.template_image));
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching Special QR settings", error);
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

    const handleDrag = (e, type, fieldId = null) => {
        e.preventDefault();
        const rect = imageRef.current.getBoundingClientRect();

        const onMouseMove = (moveEvent) => {
            let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            if (type === 'code') {
                setSettings(prev => ({ ...prev, code_x: x, code_y: y }));
            } else if (type === 'field') {
                setSettings(prev => ({
                    ...prev,
                    field_layouts: prev.field_layouts.map(f => 
                        f.field_id === fieldId ? { ...f, x, y } : f
                    )
                }));
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const toggleField = (fieldId) => {
        const exists = settings.field_layouts.find(f => f.field_id === fieldId);
        if (exists) {
            setSettings({
                ...settings,
                field_layouts: settings.field_layouts.filter(f => f.field_id !== fieldId)
            });
        } else {
            const field = event.form_fields.find(f => f.id === fieldId);
            setSettings({
                ...settings,
                field_layouts: [...settings.field_layouts, {
                    field_id: fieldId,
                    label: field.label,
                    is_photo: field.field_type === 'file',
                    shape: field.field_type === 'file' ? 'circle' : null,
                    width: field.field_type === 'file' ? 15 : null,
                    height: field.field_type === 'file' ? 15 : null,
                    x: 50,
                    y: 70,
                    font_size: field.field_type === 'file' ? null : 20,
                    color: field.field_type === 'file' ? null : '#000000',
                    font_family: field.field_type === 'file' ? null : 'Roboto-Bold.ttf'
                }]
            });
        }
    };

    const updateFieldSetting = (fieldId, key, value) => {
        setSettings({
            ...settings,
            field_layouts: settings.field_layouts.map(f => 
                f.field_id === fieldId ? { ...f, [key]: value } : f
            )
        });
    };

    const handleSave = async () => {
        const formData = new FormData();
        if (template) formData.append('template_image', template);

        Object.keys(settings).forEach(key => {
            if (key !== 'template_image' && settings[key] !== null) {
                if (key === 'field_layouts') {
                    formData.append(key, JSON.stringify(settings[key]));
                } else {
                    formData.append(key, settings[key]);
                }
            }
        });

        try {
            const response = await updateSpecialQRSettings(slug, formData);
            if (response.data) {
                setSettings({
                    ...settings,
                    ...response.data,
                    field_layouts: response.data.field_layouts || []
                });
                if (response.data.template_image) {
                    setPreviewUrl(getImageUrl(response.data.template_image));
                }
                setTemplate(null);
            }
            alert("Pengaturan QR Khusus berhasil disimpan!");
        } catch (error) {
            console.error("Save error", error);
            alert("Gagal menyimpan pengaturan.");
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm("Perbarui semua gambar tiket peserta dengan desain baru ini? Proses ini mungkin memakan waktu beberapa saat.")) return;
        
        try {
            const response = await regenerateQRImages(slug);
            alert(response.data.message);
        } catch (error) {
            console.error("Regenerate error", error);
            alert("Gagal memperbarui tiket.");
        }
    };

    const getPreviewFontSize = (baseSize) => {
        if (!imageRef.current || !imageLoaded) return baseSize / 2;
        const rect = imageRef.current.getBoundingClientRect();
        return (baseSize / 1000) * rect.height;
    };

    if (loading) return <div className="p-4 text-center">Memuat pengaturan...</div>;

    return (
        <div className="special-qr-editor bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Editor QR Khusus (BIB Style)</h3>
                    <p className="text-xs text-gray-500 mt-1">Buat desain tiket kustom dengan QR/Barcode dan data peserta yang bisa diatur posisinya.</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl">
                    <span className="text-sm font-bold text-gray-600">Status Aktif</span>
                    <button
                        onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.is_active ? 'bg-purple-600' : 'bg-gray-300'}`}
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
                            <div className={`relative inline-block shadow-2xl rounded-lg overflow-hidden ${!imageLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
                                <img
                                    ref={imageRef}
                                    src={previewUrl}
                                    alt="QR Template"
                                    className="max-w-full h-auto block"
                                    onLoad={() => setImageLoaded(true)}
                                />
                                
                                {/* Code (QR/Barcode) Placeholder */}
                                <div
                                    className="absolute cursor-move border-2 border-purple-500 bg-white/80 flex items-center justify-center select-none overflow-hidden"
                                    style={{
                                        left: `${settings.code_x}%`,
                                        top: `${settings.code_y}%`,
                                        width: `${settings.code_width}%`,
                                        height: `${settings.code_height}%`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                    onMouseDown={(e) => handleDrag(e, 'code')}
                                >
                                    <div className="flex flex-col items-center justify-center text-purple-600">
                                        <span className="material-icons" style={{ fontSize: '3vw' }}>
                                            {settings.code_type === 'barcode' ? 'barcode' : 'qr_code_2'}
                                        </span>
                                        <span className="text-[0.6vw] font-black uppercase mt-1">
                                            {settings.code_type === 'barcode' ? 'BARCODE' : 'QR CODE'}
                                        </span>
                                    </div>
                                </div>

                                {/* Dynamic Fields Placeholders */}
                                {settings.field_layouts.map(f => (
                                    <div
                                        key={f.field_id}
                                        className={`absolute cursor-move flex items-center justify-center select-none ${f.is_photo ? 'border-2 border-dashed border-blue-400 bg-blue-50/50' : 'whitespace-nowrap'}`}
                                        style={{
                                            left: `${f.x}%`,
                                            top: `${f.y}%`,
                                            width: f.is_photo ? `${f.width}%` : 'auto',
                                            height: f.is_photo ? `${f.height}%` : 'auto',
                                            transform: 'translate(-50%, -50%)',
                                            fontSize: !f.is_photo ? `${getPreviewFontSize(f.font_size)}px` : 'inherit',
                                            color: !f.is_photo ? f.color : 'inherit',
                                            fontFamily: !f.is_photo ? getFontCss(f.font_family) : 'inherit',
                                            fontWeight: 'bold',
                                            textShadow: !f.is_photo ? '0 0 2px rgba(255,255,255,0.8)' : 'none',
                                            borderRadius: f.is_photo && f.shape === 'circle' ? '100%' : '0'
                                        }}
                                        onMouseDown={(e) => handleDrag(e, 'field', f.field_id)}
                                    >
                                        {f.is_photo ? (
                                            <div className="flex flex-col items-center justify-center text-blue-500 overflow-hidden px-1">
                                                <span className="material-icons" style={{ fontSize: '1.5vw' }}>account_box</span>
                                                <span className="text-[0.5vw] font-black uppercase text-center">{f.label}</span>
                                            </div>
                                        ) : (
                                            `[${f.label}]`
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-12">
                                <span className="material-icons text-7xl text-gray-200 mb-4 block">add_photo_alternate</span>
                                <p className="text-gray-400 font-bold">Unggah desain latar belakang (landscape/portrait) untuk memulai.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Section */}
                <div className="space-y-6 h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. Upload Desain</label>
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="qr-template-upload" />
                            <label htmlFor="qr-template-upload" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl cursor-pointer hover:border-purple-400 transition shadow-sm">
                                <span className="material-icons text-purple-500">cloud_upload</span>
                                <span className="text-xs font-bold text-gray-600 truncate">{template ? template.name : 'Pilih File...'}</span>
                            </label>
                        </div>

                        <hr className="border-gray-200" />

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">2. Jenis Kode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setSettings({...settings, code_type: 'qr'})}
                                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${settings.code_type === 'qr' ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}
                                >
                                    QR Code
                                </button>
                                <button 
                                    onClick={() => setSettings({...settings, code_type: 'barcode'})}
                                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${settings.code_type === 'barcode' ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}
                                >
                                    Barcode
                                </button>
                            </div>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Lebar Kode (%)</label>
                                    <input type="range" min="5" max="80" value={settings.code_width} onChange={(e) => setSettings({ ...settings, code_width: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Tinggi Kode (%)</label>
                                    <input type="range" min="5" max="80" value={settings.code_height} onChange={(e) => setSettings({ ...settings, code_height: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">3. Data Peserta</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {event?.form_fields?.map(field => {
                                    const isActive = settings.field_layouts.some(f => f.field_id === field.id);
                                    return (
                                        <button
                                            key={field.id}
                                            onClick={() => toggleField(field.id)}
                                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all border ${isActive ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                                        >
                                            {field.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-4">
                                {settings.field_layouts.map(f => (
                                    <div key={f.field_id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-800 truncate">{f.label}</span>
                                            <button onClick={() => toggleField(f.field_id)} className="text-red-400 hover:text-red-600 transition">
                                                <span className="material-icons text-xs">close</span>
                                            </button>
                                        </div>
                                        
                                        {f.is_photo ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[8px] font-bold text-gray-400 uppercase block mb-1">Bentuk Foto</label>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {['circle', 'square', 'portrait'].map(sh => (
                                                            <button 
                                                                key={sh}
                                                                onClick={() => updateFieldSetting(f.field_id, 'shape', sh)}
                                                                className={`py-1 px-2 rounded-lg text-[8px] font-bold uppercase border transition-all ${f.shape === sh ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                                                            >
                                                                {sh === 'circle' ? 'Bulat' : sh === 'square' ? 'Kotak' : '4:5'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[8px] font-bold text-gray-400 uppercase block">Lebar (%)</label>
                                                        <input type="number" value={f.width} onChange={(e) => updateFieldSetting(f.field_id, 'width', parseFloat(e.target.value) || 5)} className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[10px] font-bold" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[8px] font-bold text-gray-400 uppercase block">Tinggi (%)</label>
                                                        <input type="number" value={f.height} onChange={(e) => updateFieldSetting(f.field_id, 'height', parseFloat(e.target.value) || 5)} className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[10px] font-bold" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex gap-2 mb-2">
                                                    <div className="flex-1">
                                                        <label className="text-[8px] font-bold text-gray-400 uppercase">Size</label>
                                                        <input type="number" value={f.font_size} onChange={(e) => updateFieldSetting(f.field_id, 'font_size', parseInt(e.target.value) || 10)} className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[10px] font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] font-bold text-gray-400 uppercase">Color</label>
                                                        <input type="color" value={f.color} onChange={(e) => updateFieldSetting(f.field_id, 'color', e.target.value)} className="h-7 w-10 border-0 p-0 bg-transparent cursor-pointer" />
                                                    </div>
                                                </div>
                                                <select
                                                    value={f.font_family}
                                                    onChange={(e) => updateFieldSetting(f.field_id, 'font_family', e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[9px] font-bold focus:outline-none"
                                                >
                                                    {FONT_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button onClick={handleSave} disabled={!previewUrl} className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${!previewUrl ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                                <span className="material-icons text-sm">save</span>
                                <span className="text-[10px] uppercase tracking-widest">Simpan Desain QR</span>
                            </button>
                            
                            {settings.is_active && (
                                <button onClick={handleRegenerate} className="w-full font-black py-3 rounded-2xl border-2 border-purple-100 text-purple-600 hover:bg-purple-50 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <span className="material-icons text-sm">sync</span>
                                    <span className="text-[10px] uppercase tracking-widest">Perbarui Semua Tiket</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default SpecialQREditor;

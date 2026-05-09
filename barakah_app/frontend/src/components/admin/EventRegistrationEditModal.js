import React, { useState, useEffect } from 'react';
import { updateEventRegistration } from '../../services/eventApi';

const EventRegistrationEditModal = ({ isOpen, onClose, event, registration, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        guest_name: '',
        guest_email: '',
        price_variation: '',
        responses: {}
    });

    useEffect(() => {
        if (registration) {
            setFormData({
                guest_name: registration.guest_name || registration.user_details?.profile?.name_full || registration.user_details?.username || '',
                guest_email: registration.guest_email || registration.user_details?.email || '',
                price_variation: registration.price_variation || '',
                responses: registration.responses || {}
            });
        }
    }, [registration]);

    if (!isOpen || !event || !registration) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await updateEventRegistration(registration.id, formData);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Gagal memperbarui data pendaftaran.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResponseChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            responses: {
                ...prev.responses,
                [fieldId]: value
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl relative my-auto animate-scale-up border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">Edit Data Peserta</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {registration.unique_code || registration.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition shadow-sm border border-gray-100"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                            <span className="material-icons text-lg">error_outline</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Standard Fields */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nama Peserta *</label>
                                <input
                                    required
                                    type="text"
                                    name="guest_name"
                                    value={formData.guest_name}
                                    onChange={handleFormChange}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                    placeholder="Nama Peserta"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                                <input
                                    type="email"
                                    name="guest_email"
                                    value={formData.guest_email}
                                    onChange={handleFormChange}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                    placeholder="Email Peserta"
                                />
                            </div>

                            {/* Price Variation Selection */}
                            {event.price_variations && event.price_variations.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Variasi Paket</label>
                                    <div className="relative">
                                        <select
                                            name="price_variation"
                                            value={formData.price_variation || ''}
                                            onChange={handleFormChange}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none appearance-none"
                                        >
                                            <option value="">Pilih Variasi</option>
                                            {event.price_variations.map(v => (
                                                <option key={v.id} value={v.id}>{v.title} (Rp {Number(v.price).toLocaleString('id-ID')})</option>
                                            ))}
                                        </select>
                                        <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Event Fields */}
                            {event.form_fields && event.form_fields.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 mt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                                        Isian Formulir Pendaftaran
                                    </h3>
                                    <div className="space-y-4">
                                        {event.form_fields.map(field => {
                                            if (field.field_type === 'file') return null; // Skip file fields for now as they require different handling

                                            return (
                                                <div key={field.id} className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                                        {field.label} {field.required ? '*' : '(Opsional)'}
                                                    </label>
                                                    {field.field_type === 'select' || field.field_type === 'radio' ? (
                                                        <select
                                                            required={field.required}
                                                            value={formData.responses[field.id] || ''}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none appearance-none"
                                                        >
                                                            <option value="">Pilih Opsi</option>
                                                            {(field.options || []).map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : field.field_type === 'textarea' ? (
                                                        <textarea
                                                            required={field.required}
                                                            value={formData.responses[field.id] || ''}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none resize-none"
                                                            rows="3"
                                                            placeholder={field.placeholder || field.label}
                                                        />
                                                    ) : (
                                                        <input
                                                            required={field.required}
                                                            type={field.field_type === 'number' ? 'number' : 'text'}
                                                            value={formData.responses[field.id] || ''}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                                            placeholder={field.placeholder || field.label}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-50 flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                BATAL
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest shadow-xl hover:bg-gray-800 transition disabled:opacity-70 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        MENYIMPAN...
                                    </>
                                ) : 'SIMPAN PERUBAHAN'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EventRegistrationEditModal;

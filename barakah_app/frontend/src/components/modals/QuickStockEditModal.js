import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getMediaUrl } from '../../utils/mediaUtils';

function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return null;
}

const QuickStockEditModal = ({ isOpen, onClose, products = [], onSuccess }) => {
    // Local draft of stocks: { [prodId]: { stock: number, variations: { [varId]: number } } }
    const [stockDrafts, setStockDrafts] = useState({});
    const [expandedVariations, setExpandedVariations] = useState(new Set());
    const [selectedProductIds, setSelectedProductIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'out_of_stock' | 'low_stock' | 'changed'
    const [saving, setSaving] = useState(false);
    const [bulkValue, setBulkValue] = useState('');
    const [bulkDelta, setBulkDelta] = useState('');

    // Inisialisasi draft stok saat modal dibuka atau products berubah
    useEffect(() => {
        if (!isOpen) return;

        const drafts = {};
        products.forEach((p) => {
            const hasVars = p.variations && p.variations.length > 0;
            const varsDraft = {};
            if (hasVars) {
                p.variations.forEach((v) => {
                    varsDraft[v.id] = Number(v.stock ?? 0);
                });
            }
            drafts[p.id] = {
                stock: Number(hasVars ? (p.total_stock ?? p.stock ?? 0) : (p.stock ?? 0)),
                variations: varsDraft,
            };
        });
        setStockDrafts(drafts);
        setSelectedProductIds(new Set());
        setSearchQuery('');
        setStatusFilter('all');
        setBulkValue('');
        setBulkDelta('');
    }, [isOpen, products]);

    // Helper: Cek apakah stok produk ini berubah dari data awal
    const isProductChanged = (product) => {
        const draft = stockDrafts[product.id];
        if (!draft) return false;

        const hasVars = product.variations && product.variations.length > 0;
        if (hasVars) {
            return product.variations.some((v) => {
                const draftVarStock = draft.variations?.[v.id];
                return draftVarStock !== undefined && Number(draftVarStock) !== Number(v.stock ?? 0);
            });
        }

        return Number(draft.stock) !== Number(product.stock ?? 0);
    };

    // Helper: Hitung total stok saat ini dari draft
    const getDraftCurrentTotalStock = (product) => {
        const draft = stockDrafts[product.id];
        if (!draft) return Number(product.total_stock ?? product.stock ?? 0);

        const hasVars = product.variations && product.variations.length > 0;
        if (hasVars) {
            return Object.values(draft.variations || {}).reduce((sum, s) => sum + (Number(s) || 0), 0);
        }
        return Number(draft.stock || 0);
    };

    // Ubah stok single product (tanpa variasi)
    const handleStockChange = (productId, newStock) => {
        const cleanVal = Math.max(0, parseInt(newStock, 10) || 0);
        setStockDrafts((prev) => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                stock: cleanVal,
            },
        }));
    };

    // Stepper + / -
    const handleStockStep = (productId, delta) => {
        setStockDrafts((prev) => {
            const current = prev[productId]?.stock ?? 0;
            const updated = Math.max(0, current + delta);
            return {
                ...prev,
                [productId]: {
                    ...prev[productId],
                    stock: updated,
                },
            };
        });
    };

    // Ubah stok variasi produk
    const handleVariationStockChange = (productId, varId, newStock) => {
        const cleanVal = Math.max(0, parseInt(newStock, 10) || 0);
        setStockDrafts((prev) => {
            const currentVars = { ...(prev[productId]?.variations || {}) };
            currentVars[varId] = cleanVal;
            const totalStock = Object.values(currentVars).reduce((sum, s) => sum + (Number(s) || 0), 0);
            return {
                ...prev,
                [productId]: {
                    ...prev[productId],
                    stock: totalStock,
                    variations: currentVars,
                },
            };
        });
    };

    const handleVariationStockStep = (productId, varId, delta) => {
        setStockDrafts((prev) => {
            const currentVars = { ...(prev[productId]?.variations || {}) };
            const currentStock = currentVars[varId] ?? 0;
            currentVars[varId] = Math.max(0, currentStock + delta);
            const totalStock = Object.values(currentVars).reduce((sum, s) => sum + (Number(s) || 0), 0);
            return {
                ...prev,
                [productId]: {
                    ...prev[productId],
                    stock: totalStock,
                    variations: currentVars,
                },
            };
        });
    };

    // Reset 1 produk ke stok awal
    const handleResetProduct = (product) => {
        const hasVars = product.variations && product.variations.length > 0;
        const varsDraft = {};
        if (hasVars) {
            product.variations.forEach((v) => {
                varsDraft[v.id] = Number(v.stock ?? 0);
            });
        }

        setStockDrafts((prev) => ({
            ...prev,
            [product.id]: {
                stock: Number(hasVars ? (product.total_stock ?? product.stock ?? 0) : (product.stock ?? 0)),
                variations: varsDraft,
            },
        }));
    };

    // Toggle expand accordion variasi
    const toggleExpandVariation = (productId) => {
        setExpandedVariations((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    // Toggle Checkbox Item
    const handleToggleSelectProduct = (productId) => {
        setSelectedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    // List produk yang berubah
    const changedProducts = useMemo(() => {
        return products.filter((p) => isProductChanged(p));
    }, [products, stockDrafts]);

    // Filter produk berdasarkan Search & Status
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            // Filter query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchTitle = (p.title || '').toLowerCase().includes(q);
                const matchCat = (p.category || '').toLowerCase().includes(q);
                if (!matchTitle && !matchCat) return false;
            }

            const currentTotal = getDraftCurrentTotalStock(p);

            // Filter status
            if (statusFilter === 'out_of_stock') {
                return currentTotal <= 0;
            }
            if (statusFilter === 'low_stock') {
                return currentTotal > 0 && currentTotal <= 5;
            }
            if (statusFilter === 'changed') {
                return isProductChanged(p);
            }

            return true;
        });
    }, [products, searchQuery, statusFilter, stockDrafts]);

    // Select All
    const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.has(p.id));

    const handleToggleSelectAll = () => {
        if (isAllFilteredSelected) {
            setSelectedProductIds(new Set());
        } else {
            const next = new Set(filteredProducts.map((p) => p.id));
            setSelectedProductIds(next);
        }
    };

    // Bulk Action: Set stok seragam ke produk terpilih
    const handleApplyBulkSet = () => {
        if (selectedProductIds.size === 0) {
            alert('Pilih minimal 1 produk dengan mencentang kotak pilihan.');
            return;
        }
        if (bulkValue === '' || isNaN(bulkValue)) {
            alert('Masukkan angka stok yang valid.');
            return;
        }

        const targetStock = Math.max(0, parseInt(bulkValue, 10));
        setStockDrafts((prev) => {
            const nextDrafts = { ...prev };
            products.forEach((p) => {
                if (selectedProductIds.has(p.id)) {
                    const hasVars = p.variations && p.variations.length > 0;
                    if (hasVars) {
                        const newVars = {};
                        p.variations.forEach((v) => {
                            newVars[v.id] = targetStock;
                        });
                        nextDrafts[p.id] = {
                            stock: targetStock * p.variations.length,
                            variations: newVars,
                        };
                    } else {
                        nextDrafts[p.id] = {
                            ...nextDrafts[p.id],
                            stock: targetStock,
                        };
                    }
                }
            });
            return nextDrafts;
        });
        setBulkValue('');
    };

    // Bulk Action: Tambah stok (+/-) ke produk terpilih
    const handleApplyBulkDelta = (amount) => {
        const delta = amount !== undefined ? amount : parseInt(bulkDelta, 10);
        if (selectedProductIds.size === 0) {
            alert('Pilih minimal 1 produk dengan mencentang kotak pilihan.');
            return;
        }
        if (isNaN(delta)) {
            alert('Masukkan angka penambahan stok yang valid.');
            return;
        }

        setStockDrafts((prev) => {
            const nextDrafts = { ...prev };
            products.forEach((p) => {
                if (selectedProductIds.has(p.id)) {
                    const hasVars = p.variations && p.variations.length > 0;
                    if (hasVars) {
                        const currentVars = { ...(nextDrafts[p.id]?.variations || {}) };
                        Object.keys(currentVars).forEach((vId) => {
                            currentVars[vId] = Math.max(0, (currentVars[vId] || 0) + delta);
                        });
                        const total = Object.values(currentVars).reduce((sum, s) => sum + (Number(s) || 0), 0);
                        nextDrafts[p.id] = {
                            stock: total,
                            variations: currentVars,
                        };
                    } else {
                        const cur = nextDrafts[p.id]?.stock || 0;
                        nextDrafts[p.id] = {
                            ...nextDrafts[p.id],
                            stock: Math.max(0, cur + delta),
                        };
                    }
                }
            });
            return nextDrafts;
        });
        setBulkDelta('');
    };

    // Simpan semua perubahan stok ke backend
    const handleSaveAll = async () => {
        if (changedProducts.length === 0) {
            alert('Belum ada perubahan stok yang dilakukan.');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                alert('Sesi masuk telah berakhir. Silakan login kembali.');
                return;
            }

            // Siapkan payload hanya untuk produk yang mengalami perubahan
            const payloadItems = changedProducts.map((p) => {
                const draft = stockDrafts[p.id];
                const hasVars = p.variations && p.variations.length > 0;

                if (hasVars) {
                    const variationsPayload = p.variations.map((v) => ({
                        id: v.id,
                        stock: draft.variations?.[v.id] !== undefined ? draft.variations[v.id] : v.stock,
                    }));
                    return {
                        product_id: p.id,
                        variations: variationsPayload,
                    };
                }

                return {
                    product_id: p.id,
                    stock: draft.stock,
                };
            });

            const res = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/api/products/bulk-stock-update/`,
                { items: payloadItems },
                {
                    headers: {
                        Authorization: `Bearer ${user.access}`,
                        'X-CSRFToken': getCsrfToken(),
                    },
                }
            );

            alert(res.data?.message || `Berhasil memperbarui stok ${changedProducts.length} produk.`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating bulk stock:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || 'Gagal memperbarui stok produk.';
            alert(`Gagal: ${errMsg}`);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-scale-up">
                {/* Header */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <span className="material-icons text-xl sm:text-2xl text-emerald-300">inventory_2</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black tracking-tight">Edit Stok Cepat (List Massal)</h3>
                                <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {products.length} Produk
                                </span>
                            </div>
                            <p className="text-xs text-emerald-100/80 mt-0.5">
                                Perbarui stok banyak produk dan variasi secara langsung dalam bentuk list tanpa membuka form satu per satu
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                    >
                        <span className="material-icons text-lg">close</span>
                    </button>
                </div>

                {/* Toolbar Filter & Search */}
                <div className="p-3.5 sm:p-4 bg-gray-50 border-b border-gray-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
                    <div className="relative flex-1">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Cari berdasarkan nama produk atau kategori..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-icons text-xs">close</span>
                            </button>
                        )}
                    </div>

                    {/* Filter Status Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                                statusFilter === 'all'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            Semua ({products.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('out_of_stock')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                                statusFilter === 'out_of_stock'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Habis ({products.filter((p) => getDraftCurrentTotalStock(p) <= 0).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('low_stock')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                                statusFilter === 'low_stock'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Rendah ≤ 5 ({products.filter((p) => {
                                const s = getDraftCurrentTotalStock(p);
                                return s > 0 && s <= 5;
                            }).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('changed')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                                statusFilter === 'changed'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                            }`}
                        >
                            <span className="material-icons text-[14px]">edit</span>
                            Berubah ({changedProducts.length})
                        </button>
                    </div>
                </div>

                {/* Bulk Action Bar (Aktif jika produk dicentang) */}
                <div className="bg-emerald-50/70 border-b border-emerald-100/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isAllFilteredSelected}
                                onChange={handleToggleSelectAll}
                                className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 transition cursor-pointer"
                            />
                            <span>Pilih Semua Halaman ({filteredProducts.length})</span>
                        </label>
                        {selectedProductIds.size > 0 && (
                            <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                {selectedProductIds.size} produk terpilih
                            </span>
                        )}
                    </div>

                    {selectedProductIds.size > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Set stok"
                                    value={bulkValue}
                                    onChange={(e) => setBulkValue(e.target.value)}
                                    className="w-18 px-2 py-1 text-xs outline-none text-center font-bold"
                                />
                                <button
                                    onClick={handleApplyBulkSet}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded"
                                >
                                    Terapkan
                                </button>
                            </div>

                            <button
                                onClick={() => handleApplyBulkDelta(10)}
                                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition"
                            >
                                +10 Stok
                            </button>
                            <button
                                onClick={() => handleApplyBulkDelta(50)}
                                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition"
                            >
                                +50 Stok
                            </button>
                            <button
                                onClick={() => {
                                    setBulkValue('0');
                                    handleApplyBulkSet();
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 transition"
                            >
                                Set 0 (Habis)
                            </button>
                        </div>
                    )}
                </div>

                {/* Product List Table / Form */}
                <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
                                <span className="material-icons text-3xl">inventory</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-700">Tidak ada produk yang cocok</h4>
                            <p className="text-xs text-gray-400 mt-1">Coba ganti kata kunci pencarian atau ubah filter status.</p>
                        </div>
                    ) : (
                        filteredProducts.map((p) => {
                            const isSelected = selectedProductIds.has(p.id);
                            const hasVars = p.variations && p.variations.length > 0;
                            const isExpanded = expandedVariations.has(p.id);
                            const isChanged = isProductChanged(p);
                            const initialTotal = Number(p.total_stock ?? p.stock ?? 0);
                            const currentTotal = getDraftCurrentTotalStock(p);
                            const diff = currentTotal - initialTotal;

                            return (
                                <div
                                    key={p.id}
                                    className={`py-3.5 transition-colors rounded-2xl px-2.5 ${
                                        isChanged ? 'bg-amber-50/40 border border-amber-200/60 my-1' : 'hover:bg-gray-50/70'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        {/* Product Info */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelectProduct(p.id)}
                                                className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 transition cursor-pointer"
                                            />

                                            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 relative">
                                                <img
                                                    src={getMediaUrl(p.thumbnail) || '/placeholder-image.jpg'}
                                                    alt={p.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = '/placeholder-image.jpg';
                                                    }}
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                                        {p.title}
                                                    </h4>
                                                    {isChanged && (
                                                        <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                                                            Diubah
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                                                    <span>Kategori: <b className="text-gray-700 capitalize">{p.category || 'Lainnya'}</b></span>
                                                    <span>•</span>
                                                    <span>Satuan: <b className="text-gray-700">{p.unit || 'pcs'}</b></span>
                                                    {hasVars && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpandVariation(p.id)}
                                                            className="text-emerald-700 font-extrabold hover:underline flex items-center gap-0.5 ml-1"
                                                        >
                                                            <span>{p.variations.length} Variasi</span>
                                                            <span className="material-icons text-xs">
                                                                {isExpanded ? 'expand_less' : 'expand_more'}
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stock Badge & Input Stepper */}
                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pl-7 sm:pl-0">
                                            {/* Initial & Diff Badge */}
                                            <div className="text-right shrink-0">
                                                <div className="text-[10px] text-gray-400 font-medium">
                                                    Awal: {initialTotal} {p.unit || 'pcs'}
                                                </div>
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <span
                                                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                                                            currentTotal <= 0
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : currentTotal <= 5
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                        }`}
                                                    >
                                                        Total: {currentTotal}
                                                    </span>
                                                    {diff !== 0 && (
                                                        <span
                                                            className={`text-[10px] font-bold ${
                                                                diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                                                            }`}
                                                        >
                                                            ({diff > 0 ? `+${diff}` : diff})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Non-variation Stock Stepper & Quick Actions */}
                                            {!hasVars ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-2xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStockStep(p.id, -1)}
                                                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-gray-100 transition"
                                                        >
                                                            <span className="material-icons text-xs">remove</span>
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={stockDrafts[p.id]?.stock ?? p.stock ?? 0}
                                                            onChange={(e) => handleStockChange(p.id, e.target.value)}
                                                            className="w-14 text-center text-xs font-black text-gray-800 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStockStep(p.id, 1)}
                                                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-gray-100 transition"
                                                        >
                                                            <span className="material-icons text-xs">add</span>
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStockStep(p.id, 10)}
                                                        className="px-2 py-1.5 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-bold text-[10px] rounded-lg transition"
                                                        title="Tambah 10 stok"
                                                    >
                                                        +10
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStockChange(p.id, 0)}
                                                        className="px-1.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg transition"
                                                        title="Set stok ke 0 (Habis)"
                                                    >
                                                        0
                                                    </button>

                                                    {isChanged && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResetProduct(p)}
                                                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                                            title="Kembalikan ke stok semula"
                                                        >
                                                            <span className="material-icons text-xs">undo</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpandVariation(p.id)}
                                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1 transition"
                                                >
                                                    <span>{isExpanded ? 'Tutup Variasi' : 'Atur Variasi'}</span>
                                                    <span className="material-icons text-xs">
                                                        {isExpanded ? 'expand_less' : 'tune'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sub-table Variasi jika ada */}
                                    {hasVars && isExpanded && (
                                        <div className="mt-3 ml-7 p-3 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-2">
                                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                <span>Daftar Variasi ({p.variations.length})</span>
                                                <span className="text-[10px] text-gray-400 font-normal">
                                                    Ubah stok variasi, total produk akan dihitung otomatis
                                                </span>
                                            </div>

                                            <div className="divide-y divide-gray-200/60">
                                                {p.variations.map((v) => {
                                                    const curVarStock = stockDrafts[p.id]?.variations?.[v.id] ?? v.stock ?? 0;
                                                    const varDiff = curVarStock - (v.stock ?? 0);

                                                    return (
                                                        <div
                                                            key={v.id}
                                                            className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                                    {v.name}
                                                                </p>
                                                                {v.sku && (
                                                                    <p className="text-[10px] font-mono text-gray-400">
                                                                        SKU: {v.sku}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right text-[10px] text-gray-400">
                                                                    <span>Awal: {v.stock ?? 0}</span>
                                                                    {varDiff !== 0 && (
                                                                        <span
                                                                            className={`ml-1 font-bold ${
                                                                                varDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                                                                            }`}
                                                                        >
                                                                            ({varDiff > 0 ? `+${varDiff}` : varDiff})
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleVariationStockStep(p.id, v.id, -1)}
                                                                        className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded hover:bg-gray-100"
                                                                    >
                                                                        <span className="material-icons text-xs">remove</span>
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={curVarStock}
                                                                        onChange={(e) =>
                                                                            handleVariationStockChange(p.id, v.id, e.target.value)
                                                                        }
                                                                        className="w-12 text-center text-xs font-black text-gray-800 outline-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleVariationStockStep(p.id, v.id, 1)}
                                                                        className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded hover:bg-gray-100"
                                                                    >
                                                                        <span className="material-icons text-xs">add</span>
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleVariationStockStep(p.id, v.id, 10)}
                                                                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-bold text-[10px] rounded border border-gray-200 transition"
                                                                >
                                                                    +10
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Sticky Actions */}
                <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="material-icons text-base text-emerald-600">info</span>
                        <span>
                            {changedProducts.length > 0 ? (
                                <>
                                    <b className="text-emerald-700 font-black">{changedProducts.length} produk</b> mengalami perubahan stok
                                </>
                            ) : (
                                'Belum ada perubahan stok.'
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                        >
                            Tutup
                        </button>

                        {changedProducts.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    // Reset semua draft
                                    const drafts = {};
                                    products.forEach((p) => {
                                        const hasVars = p.variations && p.variations.length > 0;
                                        const varsDraft = {};
                                        if (hasVars) {
                                            p.variations.forEach((v) => {
                                                varsDraft[v.id] = Number(v.stock ?? 0);
                                            });
                                        }
                                        drafts[p.id] = {
                                            stock: Number(hasVars ? (p.total_stock ?? p.stock ?? 0) : (p.stock ?? 0)),
                                            variations: varsDraft,
                                        };
                                    });
                                    setStockDrafts(drafts);
                                }}
                                disabled={saving}
                                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition"
                            >
                                Reset Semua
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={saving || changedProducts.length === 0}
                            className={`flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition ${
                                saving || changedProducts.length === 0
                                    ? 'opacity-40 cursor-not-allowed saturate-50'
                                    : 'hover:shadow-emerald-300 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-sm">save</span>
                                    <span>Simpan Perubahan ({changedProducts.length})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickStockEditModal;

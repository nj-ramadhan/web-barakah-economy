import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * MobileCategoryFilterDropdown
 * Dropdown filter kategori khusus tampilan mobile dengan fitur:
 * - Hemat ruang (compact trigger button)
 * - Multi-select (bisa pilih lebih dari 1 kategori)
 * - Search filter realtime di dalam dropdown
 * - Badge hitungan item terpilih
 */
export default function MobileCategoryFilterDropdown({
  categories = [],
  selectedCategories = [],
  onToggleCategory,
  onReset,
  isCategorySelected,
  getCategoryIcon,
  title = "Pilih Kategori",
  accentColor = "emerald"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef(null);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Filter kategori berdasarkan teks pencarian di dalam dropdown
  const filteredCategories = useMemo(() => {
    if (!searchFilter.trim()) return categories;
    const q = searchFilter.toLowerCase().trim();
    return categories.filter(c => 
      c.key === 'Semua' || 
      (c.label && c.label.toLowerCase().includes(q)) || 
      (c.key && c.key.toLowerCase().includes(q))
    );
  }, [categories, searchFilter]);

  // Label ringkasan untuk tombol trigger
  const triggerLabel = useMemo(() => {
    if (selectedCategories.length === 0) {
      return "Semua Kategori";
    }
    if (selectedCategories.length === 1) {
      const found = categories.find(c => c.key === selectedCategories[0] || c.label === selectedCategories[0]);
      return found ? found.label : selectedCategories[0];
    }
    return `${selectedCategories.length} Kategori Dipilih`;
  }, [selectedCategories, categories]);

  return (
    <div className="md:hidden relative mb-4" ref={dropdownRef}>
      {/* Trigger Button Mobile */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
            selectedCategories.length > 0
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`material-icons text-base ${selectedCategories.length > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              category
            </span>
            <span className="truncate">{triggerLabel}</span>
            {selectedCategories.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                {selectedCategories.length}
              </span>
            )}
          </div>
          <span className="material-icons text-base text-gray-400 transition-transform duration-200 ml-1">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-2.5 rounded-2xl bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold shadow-sm transition flex items-center shrink-0"
            title="Reset Kategori"
          >
            <span className="material-icons text-sm">restart_alt</span>
          </button>
        )}
      </div>

      {/* Dropdown Menu Modal/Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[85vh] flex flex-col">
          {/* Header & Search Bar */}
          <div className="p-3 bg-gray-50/80 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1">
                <span className="material-icons text-sm text-emerald-600">filter_list</span>
                {title}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">Bisa pilih lebih dari 1</span>
            </div>

            {/* Input Pencarian Kategori */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <span className="material-icons text-sm">search</span>
              </span>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari kategori..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-800 placeholder-gray-400 font-medium"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <span className="material-icons text-xs">close</span>
                </button>
              )}
            </div>
          </div>

          {/* List Kategori dengan Multi-Select Checkbox */}
          <div className="overflow-y-auto max-h-60 p-2 space-y-1 divide-y divide-gray-50">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                <span className="material-icons text-2xl mb-1 text-gray-300">search_off</span>
                <p>Kategori "{searchFilter}" tidak ditemukan</p>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = isCategorySelected ? isCategorySelected(cat.key, cat.label) : selectedCategories.includes(cat.key);
                const isAll = cat.key === 'Semua';

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      onToggleCategory(cat.key);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {/* Checkbox indicator */}
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <span className="material-icons text-[12px] font-bold">check</span>}
                      </div>

                      {/* Icon */}
                      {getCategoryIcon && (
                        <span className={`material-icons text-sm ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {getCategoryIcon(cat.key)}
                        </span>
                      )}

                      <span className="truncate">{cat.label}</span>
                    </div>

                    {/* Count badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isSelected
                          ? 'bg-emerald-200/80 text-emerald-900'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (onReset) onReset();
                setSearchFilter('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 flex items-center gap-1"
            >
              <span className="material-icons text-sm">restart_alt</span>
              Reset
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1"
            >
              <span className="material-icons text-xs">done</span>
              Terapkan {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';

/**
 * MobileSortDropdown
 * Dropdown pengurutan hemat tempat khusus mobile
 */
export default function MobileSortDropdown({
  options = [],
  currentSort = 'populer',
  onSortChange,
  label = "Urutkan"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const activeOption = options.find(opt => opt.key === currentSort) || options[0] || { label: 'Paling Populer', icon: 'trending_up' };

  return (
    <div className="md:hidden relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold shadow-xs hover:border-emerald-300 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-icons text-sm text-emerald-600">tune</span>
          <span className="text-gray-500 font-semibold">{label}:</span>
          <span className="flex items-center gap-1 text-emerald-800 font-black truncate">
            {activeOption.icon && (
              <span className="material-icons text-[13px] text-emerald-600">{activeOption.icon}</span>
            )}
            {activeOption.label}
          </span>
        </div>
        <span className="material-icons text-sm text-gray-400 ml-1">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 p-1.5 space-y-0.5">
          {options.map((opt) => {
            const isSelected = opt.key === currentSort;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onSortChange(opt.key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-900 font-black'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-icons text-sm ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="material-icons text-xs text-emerald-600">check</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

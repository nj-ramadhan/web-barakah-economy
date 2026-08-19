// components/common/Pagination.js
import React from 'react';

const Pagination = ({ currentPage = 1, totalItems = 0, itemsPerPage = 10, onPageChange }) => {
    const total = Number(totalItems) || 0;
    const perPage = Math.max(1, Number(itemsPerPage) || 10);
    const totalPages = Math.ceil(total / perPage);

    if (total <= 0 || isNaN(totalPages) || !isFinite(totalPages) || totalPages <= 1) {
        return null;
    }

    const curr = Math.max(1, Math.min(Number(currentPage) || 1, totalPages));
    const startItem = (curr - 1) * perPage + 1;
    const endItem = Math.min(curr * perPage, total);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (curr <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (curr >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', curr - 1, curr, curr + 1, '...', totalPages);
            }
        }
        return pages.filter(p => p === '...' || (!isNaN(p) && p > 0));
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 pb-2 border-t border-gray-100 mt-6">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Menampilkan <span className="text-gray-700">{startItem}-{endItem}</span> dari <span className="text-gray-700">{total}</span> riwayat
            </p>

            <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                <button
                    onClick={() => onPageChange(curr - 1)}
                    disabled={curr <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 hover:text-emerald-700 shadow-sm border border-gray-100 transition"
                    title="Halaman Sebelumnya"
                >
                    <span className="material-icons text-base">chevron_left</span>
                </button>

                {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                        return (
                            <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400">
                                ...
                            </span>
                        );
                    }
                    const isActive = pageNum === curr;
                    return (
                        <button
                            key={`page-${pageNum}`}
                            onClick={() => onPageChange(pageNum)}
                            className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                                isActive
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm border border-gray-100'
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    onClick={() => onPageChange(curr + 1)}
                    disabled={curr >= totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 hover:text-emerald-700 shadow-sm border border-gray-100 transition"
                    title="Halaman Berikutnya"
                >
                    <span className="material-icons text-base">chevron_right</span>
                </button>
            </div>
        </div>
    );
};

export default Pagination;

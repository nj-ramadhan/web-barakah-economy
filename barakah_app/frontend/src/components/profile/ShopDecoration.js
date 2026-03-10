import React from 'react';

const ShopDecoration = ({ decoration, themeColor, isPreview = false }) => {
    if (!decoration || decoration === 'none') return null;

    const isDark = themeColor === 'dark';

    // For previews, we want the element to cover the preview box completely.
    // For the actual page, fixed inset-0 to cover the whole viewport behind content.
    const wrapperClass = isPreview
        ? "absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-3xl"
        : "fixed inset-0 pointer-events-none z-0 overflow-hidden";

    if (decoration === 'geometric') {
        const geoColor = isDark ? 'border-gray-500' : 'border-gray-400';
        return (
            <div className={wrapperClass}>
                <div className={`absolute inset-4 border-[6px] border-double ${geoColor} opacity-50 rounded-2xl`}></div>
                <div className={`absolute inset-10 border-[2px] border-dashed ${geoColor} opacity-30 rounded-xl`}></div>
            </div>
        );
    }

    if (decoration === 'islamic') {
        const isoColor = isDark ? 'text-emerald-400' : 'text-emerald-600';
        return (
            <div className={wrapperClass}>
                <div className={`absolute top-0 right-0 ${isPreview ? 'w-48 h-48' : 'w-72 h-72'} opacity-20 ${isoColor} animate-[spin_40s_linear_infinite]`}>
                    <svg viewBox="0 0 100 100" fill="currentColor"><path d="M50 0 L55 35 L100 50 L55 65 L50 100 L45 65 L0 50 L45 35 Z"></path><path d="M15 15 L35 45 L85 15 L55 50 L85 85 L45 55 L15 85 L45 50 Z" opacity="0.5"></path></svg>
                </div>
                <div className={`absolute bottom-0 left-0 ${isPreview ? 'w-48 h-48' : 'w-72 h-72'} opacity-20 ${isoColor} animate-[spin_40s_linear_infinite_reverse]`}>
                    <svg viewBox="0 0 100 100" fill="currentColor"><path d="M50 0 L55 35 L100 50 L55 65 L50 100 L45 65 L0 50 L45 35 Z"></path><path d="M15 15 L35 45 L85 15 L55 50 L85 85 L45 55 L15 85 L45 50 Z" opacity="0.5"></path></svg>
                </div>
            </div>
        );
    }

    return null;
};

export default ShopDecoration;

import React from 'react';

const BrandPageLoader = ({ text = 'Memuat Barakah Economy...', isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-950 flex flex-col items-center justify-center transition-opacity duration-500 ease-out">
      {/* Background ambient glow */}
      <div className="absolute w-72 h-72 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center max-w-xs px-6 text-center">
        {/* Logo Container with pulse & glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500 to-green-300 rounded-3xl opacity-30 blur-md animate-pulse"></div>
          <div className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-emerald-500/10 border border-emerald-100 dark:border-gray-800 p-3 flex items-center justify-center">
            <img 
              src="/images/logo.png" 
              alt="Barakah Economy" 
              className="w-full h-full object-contain animate-bounce-subtle"
              onError={(e) => {
                // Fallback to favicon or text if logo not found
                e.target.onerror = null;
                e.target.src = '/logo192.png';
              }}
            />
          </div>
        </div>

        {/* Brand Text */}
        <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-wider uppercase">
          Barakah Economy
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 mb-6">
          Penguatan Ekosistem Ekonomi Islam
        </p>

        {/* Elegant Animated Progress Line */}
        <div className="w-44 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-600 rounded-full w-full animate-indeterminate-bar"></div>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold tracking-wide uppercase mt-3 animate-pulse">
          {text}
        </p>
      </div>

      <style>{`
        @keyframes indeterminateBar {
          0% {
            transform: translateX(-100%) scaleX(0.2);
          }
          50% {
            transform: translateX(0%) scaleX(0.7);
          }
          100% {
            transform: translateX(100%) scaleX(0.2);
          }
        }
        .animate-indeterminate-bar {
          animation: indeterminateBar 1.4s infinite ease-in-out;
          transform-origin: left;
        }
        @keyframes bounceSubtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default BrandPageLoader;

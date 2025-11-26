import React, { useState, useEffect, useRef } from 'react';

const FloatingBubble = ({ show }) => {
  // Posisi awal (Pojok kanan bawah)
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 220, 
    y: window.innerHeight - 150 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // --- 1. LOGIKA MOUSE (DESKTOP) ---
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Hanya klik kiri
    startDrag(e.clientX, e.clientY, e.currentTarget);
    e.preventDefault(); // Mencegah seleksi teks
  };

  // --- 2. LOGIKA TOUCH (MOBILE) ---
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, e.currentTarget);
    // Jangan e.preventDefault() di sini agar tombol masih bisa diklik tap
  };

  // --- FUNGSI UTAMA MULAI DRAG ---
  const startDrag = (clientX, clientY, target) => {
    setIsDragging(true);
    hasMoved.current = false;

    const rect = target.getBoundingClientRect();
    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // --- 3. EVENT LISTENER GLOBAL (WINDOW) ---
  useEffect(() => {
    // Handler untuk Desktop
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      moveBubble(e.clientX, e.clientY);
    };

    // Handler untuk Mobile
    const handleTouchMove = (e) => {
      if (!isDragging) return;
      // Penting: Mencegah layar ikut scroll saat bubble digeser
      if (e.cancelable) e.preventDefault(); 
      const touch = e.touches[0];
      moveBubble(touch.clientX, touch.clientY);
    };

    // Fungsi Penggerak
    const moveBubble = (clientX, clientY) => {
      hasMoved.current = true;

      let newX = clientX - dragOffset.current.x;
      let newY = clientY - dragOffset.current.y;

      // Batas Layar (Agar tidak keluar screen)
      const bubbleWidth = 200; 
      const bubbleHeight = 60; 
      
      // Batas Kanan & Kiri
      newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleWidth));
      // Batas Atas & Bawah
      newY = Math.max(0, Math.min(newY, window.innerHeight - bubbleHeight));

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      // Pasang listener Mouse
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      
      // Pasang listener Touch (Mobile)
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      // Bersihkan listener
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // Handle Klik Link
  const handleClick = () => {
    // Hanya buka link jika bubble TIDAK digeser
    if (!hasMoved.current) {
      window.open('https://barakah-economy.com/produk/kalender-barakah', '_blank');
    }
  };

  if (!show) return null;

  return (
    <div
      // Pasang Event Listener Mouse & Touch di sini
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        // Cursor berubah saat drag
        cursor: isDragging ? 'grabbing' : 'grab',
        // Penting untuk performa drag di mobile
        touchAction: 'none', 
      }}
      className="flex items-center bg-green-600 pr-4 pl-2 py-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:bg-green-700 transition-colors duration-200 select-none border-2 border-white/20 animate-bounce-slow"
    >
      {/* Logo */}
      <img 
        src="https://res.cloudinary.com/dfvsam6fi/image/upload/v1764136196/kalender_logo_xlrx5e.png" 
        alt="Logo Kalender"
        className="w-10 h-10 object-contain mr-2 bg-white rounded-full p-1 pointer-events-none"
      />
      
      {/* Teks */}
      <span className="font-bold text-sm text-white whitespace-nowrap drop-shadow-md">
        Pesan Kalender Disini
      </span>
    </div>
  );
};

export default FloatingBubble;
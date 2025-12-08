import React, { useState, useEffect, useRef } from 'react';

// Terima props baru: link, label, icon
const FloatingBubble = ({ show, link, label, icon }) => {
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 220, 
    y: window.innerHeight - 150 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // --- Defaults ---
  const DEFAULT_LINK = 'https://barakah-economy.com/produk/kalender-barakah';
  const DEFAULT_LABEL = 'Pesan Kalender Disini';
  const DEFAULT_ICON = 'https://res.cloudinary.com/dfvsam6fi/image/upload/v1764136196/kalender_logo_xlrx5e.png';

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY, e.currentTarget);
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, e.currentTarget);
  };

  const startDrag = (clientX, clientY, target) => {
    setIsDragging(true);
    hasMoved.current = false;
    const rect = target.getBoundingClientRect();
    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      moveBubble(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault(); 
      const touch = e.touches[0];
      moveBubble(touch.clientX, touch.clientY);
    };

    const moveBubble = (clientX, clientY) => {
      hasMoved.current = true;
      let newX = clientX - dragOffset.current.x;
      let newY = clientY - dragOffset.current.y;
      
      const bubbleWidth = 200; 
      const bubbleHeight = 60; 
      newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - bubbleHeight));

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const handleClick = () => {
    if (!hasMoved.current) {
      // Gunakan link props jika ada, jika tidak pakai default
      window.open(link || DEFAULT_LINK, '_blank');
    }
  };

  if (!show) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none', 
      }}
      className="flex items-center bg-green-600 pr-4 pl-2 py-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:bg-green-700 transition-colors duration-200 select-none border-2 border-white/20 animate-bounce-slow"
    >
      {/* Icon: Gunakan props icon jika ada, jika tidak pakai default */}
      <img 
        src={icon || DEFAULT_ICON} 
        alt="Bubble Icon"
        className="w-10 h-10 object-contain mr-2 bg-white rounded-full p-1 pointer-events-none"
      />
      
      {/* Label: Gunakan props label jika ada, jika tidak pakai default */}
      <span className="font-bold text-sm text-white whitespace-nowrap drop-shadow-md">
        {label || DEFAULT_LABEL}
      </span>
    </div>
  );
};

export default FloatingBubble;
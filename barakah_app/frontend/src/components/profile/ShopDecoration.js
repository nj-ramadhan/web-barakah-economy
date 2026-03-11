import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

const ShopDecoration = ({ decoration, themeColor, isPreview = false }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!decoration || decoration === 'none' || !containerRef.current) return;

        // Clean up or reset animations
        const elements = containerRef.current.querySelectorAll('.animate-me');

        switch (decoration) {
            case 'geometric':
                anime({
                    targets: elements,
                    translateX: () => anime.random(-30, 30),
                    translateY: () => anime.random(-30, 30),
                    rotate: () => anime.random(-30, 30),
                    duration: () => anime.random(3000, 5000),
                    delay: anime.stagger(200),
                    easing: 'easeInOutQuad',
                    direction: 'alternate',
                    loop: true
                });
                break;
            case 'bubbles':
                anime({
                    targets: containerRef.current.querySelectorAll('.bubble'),
                    translateY: () => [isPreview ? 600 : 800, -100],
                    translateX: () => anime.random(-50, 50),
                    scale: [0, 1.5],
                    opacity: [0, 0.4, 0],
                    duration: () => anime.random(4000, 8000),
                    delay: anime.stagger(400),
                    easing: 'linear',
                    loop: true
                });
                break;
            case 'islamic':
            case 'stars':
                anime({
                    targets: containerRef.current.querySelectorAll('.star-pulse'),
                    scale: [0.7, 1.3],
                    opacity: [0.1, 0.7],
                    duration: () => anime.random(1500, 3500),
                    delay: anime.stagger(200),
                    easing: 'easeInOutSine',
                    direction: 'alternate',
                    loop: true
                });
                if (decoration === 'islamic') {
                    anime({
                        targets: containerRef.current.querySelectorAll('.lantern-float'),
                        translateY: [-15, 15],
                        rotate: [-8, 8],
                        duration: () => anime.random(4000, 7000),
                        easing: 'easeInOutQuad',
                        direction: 'alternate',
                        loop: true
                    });
                }
                break;
            case 'floating_icons':
                anime({
                    targets: containerRef.current.querySelectorAll('.float-icon'),
                    translateY: [-20, 20],
                    translateX: () => anime.random(-10, 10),
                    rotate: () => anime.random(-20, 20),
                    duration: () => anime.random(3000, 6000),
                    delay: anime.stagger(300),
                    easing: 'easeInOutSine',
                    direction: 'alternate',
                    loop: true
                });
                break;
            case 'diagonal_lines':
                anime({
                    targets: containerRef.current.querySelectorAll('.line-move'),
                    translateX: ['-100%', '100%'],
                    translateY: ['-100%', '100%'],
                    opacity: [0, 0.2, 0],
                    duration: 10000,
                    easing: 'linear',
                    loop: true,
                    delay: anime.stagger(1000)
                });
                break;
            case 'confetti':
                anime({
                    targets: containerRef.current.querySelectorAll('.confetti-piece'),
                    translateY: [0, isPreview ? 650 : 1000],
                    translateX: () => anime.random(-100, 100),
                    rotate: () => anime.random(0, 360),
                    opacity: [1, 0],
                    duration: () => anime.random(3000, 5000),
                    delay: anime.stagger(100),
                    easing: 'easeInQuad',
                    loop: true
                });
                break;
            case 'clouds':
                anime({
                    targets: containerRef.current.querySelectorAll('.cloud'),
                    translateX: ['-10%', '110%'],
                    duration: () => anime.random(20000, 40000),
                    delay: anime.stagger(5000),
                    easing: 'linear',
                    loop: true
                });
                break;
            default:
                break;
        }
    }, [decoration, isPreview]);

    if (!decoration || decoration === 'none') return null;

    const isDark = themeColor === 'dark';
    // Use an absolute wrapper that sits behind everything but inside the overflow container
    const wrapperClass = isPreview
        ? "absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]"
        : "fixed inset-0 pointer-events-none z-0 overflow-hidden";

    // Adaptive style logic for elements when theme is light
    const getElementColor = (baseDark, baseLight) => isDark ? baseDark : baseLight;

    if (decoration === 'confetti') {
        const colors = ['#FFD700', '#FF1493', '#00BFFF', '#32CD32', '#FF4500'];
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="confetti-piece absolute w-2 h-3 z-0"
                        style={{
                            backgroundColor: colors[i % colors.length],
                            left: `${anime.random(0, 100)}%`,
                            top: '-20px'
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    if (decoration === 'clouds') {
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="cloud absolute opacity-30 text-white z-0"
                        style={{
                            top: `${10 + i * 20}%`,
                            left: '-10%',
                            fontSize: `${anime.random(40, 80)}px`
                        }}
                    >
                        ☁️
                    </div>
                ))}
            </div>
        );
    }

    if (decoration === 'geometric') {
        const geoColor = isDark ? 'border-gray-500/20' : 'border-gray-400/30';
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className={`animate-me absolute border-2 ${geoColor} opacity-20 z-0`}
                        style={{
                            width: anime.random(40, 150),
                            height: anime.random(40, 150),
                            top: `${anime.random(0, 100)}%`,
                            left: `${anime.random(0, 100)}%`,
                            borderRadius: i % 2 === 0 ? '50%' : '8px',
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    if (decoration === 'bubbles') {
        const bubbleColor = isDark ? 'white/20' : 'blue-400/20';
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className={`bubble absolute rounded-full bg-${bubbleColor} border border-current opacity-30 z-0`}
                        style={{
                            width: anime.random(20, 60),
                            height: anime.random(20, 60),
                            left: `${anime.random(0, 100)}%`,
                            bottom: '-50px',
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    if (decoration === 'islamic') {
        const isoColor = isDark ? 'text-emerald-400/20' : 'text-emerald-600/15';
        const goldColor = isDark ? 'text-yellow-500/30' : 'text-yellow-600/20';
        return (
            <div className={wrapperClass} ref={containerRef}>
                <div className={`absolute top-[-40px] right-[-40px] w-64 h-64 ${isoColor} animate-[spin_80s_linear_infinite] z-0`}>
                    <svg viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 0 L55 35 L100 50 L55 65 L50 100 L45 65 L0 50 L45 35 Z"></path>
                    </svg>
                </div>
                <div className={`lantern-float absolute top-10 left-[10%] w-10 h-14 ${goldColor} z-0`}>
                    <svg viewBox="0 0 24 32" fill="currentColor"><path d="M12 0 L14 4 L10 4 Z M6 4 L18 4 L18 24 L12 32 L6 24 Z"></path></svg>
                </div>
                {[...Array(20)].map((_, i) => (
                    <div key={i} className={`star-pulse absolute w-1.5 h-1.5 rounded-full z-0 ${isDark ? 'bg-white' : 'bg-emerald-300'}`} style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}></div>
                ))}
            </div>
        );
    }

    if (decoration === 'stars') {
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(40)].map((_, i) => (
                    <div key={i} className={`star-pulse absolute w-1 h-1 rounded-full shadow-[0_0_8px_white] z-0 ${isDark ? 'bg-white' : 'bg-yellow-200'}`} style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}></div>
                ))}
            </div>
        );
    }

    if (decoration === 'floating_icons') {
        const icons = ['✨', '💰', '💖', '⭐', '🔥'];
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="float-icon absolute text-xl opacity-30 z-0"
                        style={{ top: `${anime.random(0, 100)}%`, left: `${anime.random(0, 100)}%` }}
                    >
                        {icons[i % icons.length]}
                    </div>
                ))}
            </div>
        );
    }

    if (decoration === 'diagonal_lines') {
        const lineColor = isDark ? 'white/10' : 'gray-400/10';
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className={`line-move absolute w-[200%] h-1 bg-${lineColor} rotate-[-45deg] z-0`}
                        style={{ top: `${i * 10}%`, left: '-50%' }}
                    ></div>
                ))}
            </div>
        );
    }

    return null;
};

export default ShopDecoration;

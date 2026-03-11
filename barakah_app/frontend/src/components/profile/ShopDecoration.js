import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

const ShopDecoration = ({ decoration, themeColor, isPreview = false }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!decoration || decoration === 'none' || !containerRef.current) return;

        // Clean up or reset
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
                    translateY: () => [anime.random(500, 800), -100],
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
                    translateY: [0, 800],
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
    }, [decoration]);

    if (!decoration || decoration === 'none') return null;

    const isDark = themeColor === 'dark';
    const wrapperClass = isPreview
        ? "absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]"
        : "fixed inset-0 pointer-events-none z-0 overflow-hidden";

    if (decoration === 'confetti') {
        const colors = ['#FFD700', '#FF1493', '#00BFFF', '#32CD32', '#FF4500'];
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="confetti-piece absolute w-2 h-3"
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
                        className="cloud absolute opacity-20 text-white"
                        style={{
                            top: `${10 + i * 20}%`,
                            left: '-15%',
                        }}
                    >
                        <svg width="120" height="80" viewBox="0 0 120 80" fill="currentColor">
                            <path d="M100 40 a20 20 0 0 0 -40 0 a25 25 0 0 0 -50 10 a20 20 0 0 0 0 30 h90 a20 20 0 0 0 0 -40 Z" />
                        </svg>
                    </div>
                ))}
            </div>
        );
    }

    if (decoration === 'geometric') {
        const geoColor = isDark ? 'border-gray-500/20' : 'border-gray-400/15';
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className={`animate-me absolute border-2 ${geoColor}`}
                        style={{
                            width: anime.random(40, 150),
                            height: anime.random(40, 150),
                            top: `${anime.random(0, 100)}%`,
                            left: `${anime.random(0, 100)}%`,
                            borderRadius: i % 2 === 0 ? '50%' : '8px',
                            transform: `rotate(${anime.random(0, 360)}deg)`
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    if (decoration === 'bubbles') {
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="bubble absolute rounded-full bg-white/10 border border-white/20"
                        style={{
                            width: anime.random(10, 50),
                            height: anime.random(10, 50),
                            left: `${anime.random(0, 100)}%`,
                            bottom: '-50px',
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    if (decoration === 'islamic') {
        const isoColor = isDark ? 'text-emerald-400/15' : 'text-emerald-600/10';
        const goldColor = 'text-yellow-500/25';
        return (
            <div className={wrapperClass} ref={containerRef}>
                <div className={`absolute top-[-40px] right-[-40px] w-64 h-64 ${isoColor} animate-[spin_80s_linear_infinite]`}>
                    <svg viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 0 L55 35 L100 50 L55 65 L50 100 L45 65 L0 50 L45 35 Z"></path>
                    </svg>
                </div>
                <div className={`lantern-float absolute top-10 left-[15%] w-10 h-14 ${goldColor}`}>
                    <svg viewBox="0 0 24 32" fill="currentColor">
                        <path d="M12 0 L14 4 L10 4 Z M6 4 L18 4 L18 24 L12 32 L6 24 Z"></path>
                        <rect x="8" y="8" width="8" height="12" fill="rgba(255,255,255,0.2)"></rect>
                    </svg>
                </div>
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="star-pulse absolute w-1.5 h-1.5 bg-white rounded-full" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}></div>
                ))}
            </div>
        );
    }

    if (decoration === 'stars') {
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(50)].map((_, i) => (
                    <div key={i} className="star-pulse absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}></div>
                ))}
            </div>
        );
    }

    if (decoration === 'floating_icons') {
        const iconPaths = [
            "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", // Star
            "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z", // Heart
            "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.39 2.1-1.39 1.47 0 2.01.59 2.1 1.58h1.39c-0.11-1.56-1.11-2.55-2.55-2.87V5.5h-1.11v1.17c-1.35.26-2.25 1.16-2.25 2.31 0 1.34 1.1 1.99 2.72 2.39 1.8.44 2.15 1.03 2.15 1.71 0 .63-.44 1.25-2.12 1.25-1.43 0-2.13-.6-2.26-1.57h-1.4c0.14 1.58 1.18 2.53 2.58 2.84v1.2h1.11v-1.19c1.35-.25 2.33-1.03 2.33-2.3 0-1.57-1.34-2.18-2.71-2.54z" // Dollar/Coin
        ];
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="float-icon absolute opacity-20 text-yellow-500"
                        style={{ top: `${anime.random(0, 100)}%`, left: `${anime.random(0, 100)}%` }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d={iconPaths[i % iconPaths.length]} />
                        </svg>
                    </div>
                ))}
            </div>
        );
    }

    if (decoration === 'diagonal_lines') {
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className="line-move absolute w-[200%] h-0.5 bg-white/10 rotate-[-45deg]"
                        style={{ top: `${i * 12}%`, left: '-50%' }}
                    ></div>
                ))}
            </div>
        );
    }

    return null;
};

export default ShopDecoration;

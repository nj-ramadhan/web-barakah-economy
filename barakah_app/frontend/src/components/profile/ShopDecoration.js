import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

const ShopDecoration = ({ decoration, themeColor, isPreview = false }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!decoration || decoration === 'none' || !containerRef.current) return;

        // Reset any existing animations or styles if needed
        const elements = containerRef.current.querySelectorAll('.animate-me');

        if (decoration === 'geometric') {
            anime({
                targets: elements,
                translateX: () => anime.random(-20, 20),
                translateY: () => anime.random(-20, 20),
                rotate: () => anime.random(-15, 15),
                duration: () => anime.random(3000, 5000),
                delay: anime.stagger(200),
                easing: 'easeInOutQuad',
                direction: 'alternate',
                loop: true
            });
        }

        if (decoration === 'islamic' || decoration === 'stars') {
            anime({
                targets: containerRef.current.querySelectorAll('.star-pulse'),
                scale: [0.8, 1.2],
                opacity: [0.2, 0.6],
                duration: () => anime.random(2000, 4000),
                delay: anime.stagger(300),
                easing: 'easeInOutSine',
                direction: 'alternate',
                loop: true
            });

            if (decoration === 'islamic') {
                anime({
                    targets: containerRef.current.querySelectorAll('.lantern-float'),
                    translateY: [-10, 10],
                    rotate: [-5, 5],
                    duration: () => anime.random(4000, 6000),
                    easing: 'easeInOutQuad',
                    direction: 'alternate',
                    loop: true
                });
            }
        }
    }, [decoration]);

    if (!decoration || decoration === 'none') return null;

    const isDark = themeColor === 'dark';
    const wrapperClass = isPreview
        ? "absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]"
        : "fixed inset-0 pointer-events-none z-0 overflow-hidden";

    if (decoration === 'geometric') {
        const geoColor = isDark ? 'border-gray-500/30' : 'border-gray-400/20';
        return (
            <div className={wrapperClass} ref={containerRef}>
                <div className={`animate-me absolute top-10 left-10 w-32 h-32 border-4 ${geoColor} rounded-full`}></div>
                <div className={`animate-me absolute top-1/2 right-[-20px] w-48 h-48 border-2 ${geoColor} rotate-45`}></div>
                <div className={`animate-me absolute bottom-20 left-1/4 w-24 h-24 border ${geoColor} rounded-lg`}></div>
                <div className={`animate-me absolute top-1/4 right-1/4 w-16 h-16 border-8 ${geoColor} opacity-10 rounded-full`}></div>
            </div>
        );
    }

    if (decoration === 'islamic') {
        const isoColor = isDark ? 'text-emerald-400/20' : 'text-emerald-600/10';
        const goldColor = 'text-yellow-500/30';

        return (
            <div className={wrapperClass} ref={containerRef}>
                {/* Rotating Mandalas */}
                <div className={`absolute top-[-50px] right-[-50px] w-64 h-64 ${isoColor} animate-[spin_60s_linear_infinite]`}>
                    <svg viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 0 L55 35 L100 50 L55 65 L50 100 L45 65 L0 50 L45 35 Z"></path>
                        <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                    </svg>
                </div>

                {/* Floating Lanterns */}
                <div className={`lantern-float absolute top-20 left-10 w-12 h-16 ${goldColor}`}>
                    <svg viewBox="0 0 24 32" fill="currentColor">
                        <path d="M12 0 L14 4 L10 4 Z M6 4 L18 4 L18 24 L12 32 L6 24 Z"></path>
                        <rect x="8" y="8" width="8" height="12" fill="rgba(255,255,255,0.2)"></rect>
                    </svg>
                </div>

                <div className={`lantern-float absolute top-40 right-12 w-10 h-14 ${goldColor}`} style={{ animationDelay: '1s' }}>
                    <svg viewBox="0 0 24 32" fill="currentColor">
                        <path d="M12 0 L14 4 L10 4 Z M6 4 L18 4 L18 24 L12 32 L6 24 Z"></path>
                    </svg>
                </div>

                {/* Pulsing Stars */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="star-pulse absolute w-1 h-1 bg-white rounded-full opacity-40 shadow-[0_0_8px_white]"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    if (decoration === 'stars') {
        return (
            <div className={wrapperClass} ref={containerRef}>
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="star-pulse absolute w-1 h-1 bg-white rounded-full opacity-30 shadow-[0_0_5px_white]"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    ></div>
                ))}
            </div>
        )
    }

    return null;
};

export default ShopDecoration;

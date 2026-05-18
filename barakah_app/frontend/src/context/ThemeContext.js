import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        // 1. Cek preferensi tersimpan di localStorage
        const saved = localStorage.getItem('barakah_theme');
        if (saved !== null) return saved === 'dark';
        // 2. Fallback: ikuti preferensi sistem OS
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Terapkan/hapus class 'dark' pada <html> setiap kali isDark berubah
    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('barakah_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;

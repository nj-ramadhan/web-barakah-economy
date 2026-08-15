// index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';

// Global safety guard for Safari Private Mode / ITP localStorage restrictions
(() => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } catch (e) {
    console.warn('[Storage Polyfill] LocalStorage restricted or blocked (Safari Private Mode / ITP). Enabling safe memory fallback.');
    const memory = {};
    const fakeStorage = {
      getItem: (key) => (key in memory ? memory[key] : null),
      setItem: (key, val) => { memory[key] = String(val); },
      removeItem: (key) => { delete memory[key]; },
      clear: () => { for (const k in memory) delete memory[k]; },
      key: (i) => Object.keys(memory)[i] || null,
      get length() { return Object.keys(memory).length; }
    };
    try {
      Object.defineProperty(window, 'localStorage', {
        value: fakeStorage,
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch (defErr) {
      console.warn('[Storage Polyfill] Could not redefine window.localStorage:', defErr);
    }
  }
})();

// Register service worker for push notifications safely
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}


const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider clientId="264534800705-qp3cfogvfv3q2rg35036lhpa6coajt6v.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
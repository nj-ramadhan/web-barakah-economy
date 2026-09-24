import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import id from './locales/id.json';

const savedLanguage = typeof window !== 'undefined' 
  ? (localStorage.getItem('language') || localStorage.getItem('i18nextLng') || 'id')
  : 'id';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: savedLanguage, // default language from localStorage
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lng);
    localStorage.setItem('i18nextLng', lng);
  }
});

export default i18n;


import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources, RTL_LANGUAGES, type ResourceKey } from '@doviz/i18n';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    supportedLngs: Object.keys(resources),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'doviz_lang',
    },
  });

const applyDir = (lng: string) => {
  const lang = lng as ResourceKey;
  document.documentElement.lang = lang;
  document.documentElement.dir = (RTL_LANGUAGES as readonly string[]).includes(lang) ? 'rtl' : 'ltr';
};

i18n.on('languageChanged', applyDir);
applyDir(i18n.language || 'tr');

export default i18n;
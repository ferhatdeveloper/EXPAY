import tr from './locales/tr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';
import ku from './locales/ku.json';
import fa from './locales/fa.json';

export const resources = {
  tr: { translation: tr },
  en: { translation: en },
  ar: { translation: ar },
  ku: { translation: ku },
  fa: { translation: fa },
};

export const RTL_LANGUAGES: string[] = ['ar', 'ku', 'fa'];

export type ResourceKey = keyof typeof resources;

export default resources;
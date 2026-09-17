import React, { createContext, useContext, useState } from 'react';
import zhTW from '../data/locales/zh-TW.json';
import enUS from '../data/locales/en-US.json';
import { trackChangeLanguage } from '../api/analytics';

type Language = 'zh-TW' | 'en-US';
type Translations = Record<string, string>;

const locales: Record<Language, Translations> = {
  'zh-TW': zhTW,
  'en-US': enUS,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextType>({
  language: 'zh-TW',
  setLanguage: () => { },
  t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    return saved && locales[saved] ? saved : 'zh-TW';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
    trackChangeLanguage(lang);
  };

  const t = (key: string): string => {
    return locales[language][key] || locales['zh-TW'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);

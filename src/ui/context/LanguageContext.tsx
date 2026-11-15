import React, { createContext, useContext, useEffect, useState } from 'react';
import { DICTIONARY, formatString, type Language, type TranslationKey } from '../../config/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'cham_game_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ko' || saved === 'en') return saved;
      // 브라우저 언어 감지: ko가 아니면 en 기본 제안
      const browserLang = navigator.language?.toLowerCase();
      if (browserLang && !browserLang.startsWith('ko')) {
        return 'en';
      }
    } catch {
      // ignore
    }
    return 'ko';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
    // HTML lang 속성 업데이트
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ko' ? 'en' : 'ko'));
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = DICTIONARY[language] || DICTIONARY.ko;
    const template = (langDict as Record<string, string>)[key] || (DICTIONARY.ko as Record<string, string>)[key] || key;
    return formatString(template, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

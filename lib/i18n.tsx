'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import azMessages from '../messages/az.json';
import enMessages from '../messages/en.json';
import ruMessages from '../messages/ru.json';

export type Locale = 'az' | 'en' | 'ru';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const dictionaries: Record<Locale, any> = {
  az: azMessages,
  en: enMessages,
  ru: ruMessages,
};

const I18nContext = createContext<I18nContextType>({
  locale: 'az',
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('az');

  useEffect(() => {
    const saved = localStorage.getItem('bhos_tt_locale') as Locale;
    if (saved && (saved === 'az' || saved === 'en' || saved === 'ru')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('bhos_tt_locale', newLocale);
  };

  const t = (path: string, fallback?: string): string => {
    const dict = dictionaries[locale] || dictionaries.az;
    const parts = path.split('.');
    let current = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback || path;
      }
    }

    return typeof current === 'string' ? current : fallback || path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}


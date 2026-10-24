'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import azMessages from '../messages/az.json';
import enMessages from '../messages/en.json';
import ruMessages from '../messages/ru.json';

export type Locale = 'az' | 'en' | 'ru';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const dictionaries: Record<Locale, Record<string, any>> = {
  az: azMessages,
  en: enMessages,
  ru: ruMessages,
};

function isValidLocale(val: string | null | undefined): val is Locale {
  return val === 'az' || val === 'en' || val === 'ru';
}

function getCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
  const val = match ? decodeURIComponent(match[1]) : null;
  return isValidLocale(val) ? val : null;
}

function lookupInDict(dict: Record<string, any>, path: string): string | undefined {
  const parts = path.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

function translateKey(locale: Locale, path: string, fallback?: string): string {
  const primaryDict = dictionaries[locale] || dictionaries.az;
  const resolved = lookupInDict(primaryDict, path) ?? lookupInDict(dictionaries.az, path);
  return resolved ?? fallback ?? path;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'az',
  setLocale: () => {},
  t: (key: string, fallback?: string) => translateKey('az', key, fallback),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('az');

  useEffect(() => {
    const savedLocal = localStorage.getItem('bhos_tt_locale');
    const cookieLoc = getCookieLocale();
    const initial = isValidLocale(savedLocal)
      ? savedLocal
      : cookieLoc || 'az';
    setLocaleState(initial);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initial;
      document.cookie = `NEXT_LOCALE=${initial}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bhos_tt_locale', newLocale);
      document.documentElement.lang = newLocale;
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  const t = useCallback(
    (path: string, fallback?: string): string => {
      return translateKey(locale, path, fallback);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(namespace?: string) {
  const context = useContext(I18nContext);

  const scopedT = useCallback(
    (key: string, fallback?: string): string => {
      if (namespace && !key.startsWith(`${namespace}.`)) {
        const namespacedKey = `${namespace}.${key}`;
        const val = context.t(namespacedKey);
        if (val !== namespacedKey) {
          return val;
        }
      }
      return context.t(key, fallback);
    },
    [context, namespace]
  );

  return {
    ...context,
    t: scopedT,
  };
}

export function useTranslations(namespace?: string) {
  const { t } = useTranslation(namespace);
  return t;
}

import React, { useEffect, useMemo, useState } from 'react';
import en from '@/locales/en';
import fa from '@/locales/fa';
import { LanguageContext, type Lang } from './useLanguage';

const TRANSLATIONS: Record<Lang, Record<string, unknown>> = {
  en,
  fa,
};

function getFromPath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('lang');
      return (saved as Lang) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch { /* Storage may be unavailable in restricted contexts. */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
      if (lang === 'fa') {
        document.body.classList.add('font-fa');
      } else {
        document.body.classList.remove('font-fa');
      }
    }
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);

  const t = useMemo(() => {
    return (path: string) => {
      const val = getFromPath(TRANSLATIONS[lang], path);
      return typeof val === 'string' ? val : '';
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
};
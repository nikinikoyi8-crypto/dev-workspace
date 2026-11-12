import { createContext, useContext } from 'react';

export type Lang = 'en' | 'fa';

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
}

export const LanguageContext = createContext<LangContextValue | undefined>(undefined);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
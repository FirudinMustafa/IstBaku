'use client';

import * as React from 'react';
import { DEFAULT_LANG, t as translate } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangCtx = React.createContext<Ctx>({ lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k });
export const useLang = () => React.useContext(LangCtx);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(DEFAULT_LANG);

  React.useEffect(() => {
    const stored = (localStorage.getItem('istbaku-lang') as Lang) || DEFAULT_LANG;
    setLangState(stored);
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('istbaku-lang', l);
    document.documentElement.setAttribute('lang', l);
  }, []);

  const t = React.useCallback((key: string) => translate(key, lang), [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

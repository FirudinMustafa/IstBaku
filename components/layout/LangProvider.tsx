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

function readCookieLang(): Lang | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )istbaku-lang=([^;]+)/);
  return (m?.[1] as Lang) || null;
}

export function LangProvider({ children, initialLang }: { children: React.ReactNode; initialLang?: Lang }) {
  // initialLang server'da cookie'den (ülke tespiti) gelir → SSR doğru dilde,
  // hidrasyon uyumlu. Mount sonrası kullanıcının açık tercihi (localStorage) öncelikli.
  const [lang, setLangState] = React.useState<Lang>(initialLang ?? DEFAULT_LANG);

  React.useEffect(() => {
    // Öncelik: localStorage (kullanıcı seçimi) > cookie (ülke) > initial.
    const stored = (localStorage.getItem('istbaku-lang') as Lang) || readCookieLang();
    if (stored && stored !== lang) setLangState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('istbaku-lang', l);
    // Cookie'yi de yaz ki sonraki SSR isteği doğru dilde gelsin.
    document.cookie = `istbaku-lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.setAttribute('lang', l);
  }, []);

  const t = React.useCallback((key: string) => translate(key, lang), [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

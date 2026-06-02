'use client';

import * as React from 'react';
import type { Currency } from './types';
import { RATES, setLiveRates } from './currency';

/**
 * Global currency switcher store (PF-01 / PU-01).
 *
 * - Single source of truth for the user's display currency.
 * - Persists to localStorage (mirrors lang persistence) AND a non-HttpOnly
 *   cookie `istbaku-currency` so the server can also see the choice if
 *   needed for SSR.
 * - Exposes via React context + `useCurrency()` hook.
 *
 * The actual FX math lives in `lib/currency.ts` (`convert`, `formatPrice`).
 * This module is purely state.
 */

export const SUPPORTED_CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR', 'AZN'];
export const DEFAULT_CURRENCY: Currency = 'USD';
const STORAGE_KEY = 'istbaku-currency';
const COOKIE_KEY = 'istbaku-currency';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isCurrency(v: string | null | undefined): v is Currency {
  return v === 'TRY' || v === 'USD' || v === 'EUR' || v === 'AZN';
}

function writeCookie(value: Currency) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

interface Ctx {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Aktif kur tablosu (USD bazlı). Canlı kur gelene kadar yedek kurlar. */
  rates: Record<Currency, number>;
  /** Kurlar canlı kaynaktan mı geldi? */
  ratesLive: boolean;
}

const CurrencyCtx = React.createContext<Ctx>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  rates: { ...RATES },
  ratesLive: false,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setState] = React.useState<Currency>(DEFAULT_CURRENCY);
  const [rates, setRates] = React.useState<Record<Currency, number>>({ ...RATES });
  const [ratesLive, setRatesLive] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isCurrency(stored)) {
        setState(stored);
        writeCookie(stored);
      } else {
        writeCookie(DEFAULT_CURRENCY);
      }
    } catch {
      // localStorage may be unavailable (private mode); fall through.
      writeCookie(DEFAULT_CURRENCY);
    }
  }, []);

  // Canlı döviz kurlarını çek; hem context state'ine hem de currency.ts içindeki
  // aktif tabloya (convert için) yaz.
  React.useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/rates', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rates?: Record<Currency, number>; live?: boolean } | null) => {
        if (!data?.rates) return;
        setLiveRates(data.rates);
        setRates({ ...RATES, ...data.rates });
        setRatesLive(Boolean(data.live));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const setCurrency = React.useCallback((c: Currency) => {
    setState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
    writeCookie(c);
  }, []);

  return <CurrencyCtx.Provider value={{ currency, setCurrency, rates, ratesLive }}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  return React.useContext(CurrencyCtx);
}

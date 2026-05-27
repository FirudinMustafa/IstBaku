'use client';

import * as React from 'react';
import type { Currency } from './types';

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
}

const CurrencyCtx = React.createContext<Ctx>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setState] = React.useState<Currency>(DEFAULT_CURRENCY);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isCurrency(stored)) {
        setState(stored);
        writeCookie(stored);
        return;
      }
    } catch {
      // localStorage may be unavailable (private mode); fall through.
    }
    writeCookie(DEFAULT_CURRENCY);
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

  return <CurrencyCtx.Provider value={{ currency, setCurrency }}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  return React.useContext(CurrencyCtx);
}

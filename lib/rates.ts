import type { Currency } from './types';
import { RATES as FALLBACK_RATES } from './currency';

/**
 * Canlı döviz kurları. USD bazlı (1 USD = X birim).
 *
 * Kaynak: open.er-api.com (ücretsiz, anahtarsız). Hata/erişim yoksa
 * `lib/currency.ts` içindeki sabit kurlara düşülür. Sonuç Next.js fetch
 * cache'i ile günde birkaç kez tazelenir (6 saat).
 */

export interface RatesPayload {
  base: 'USD';
  rates: Record<Currency, number>;
  fetchedAt: string;
  live: boolean;
}

const SYMBOLS: Currency[] = ['USD', 'EUR', 'TRY', 'AZN'];
const SIX_HOURS = 60 * 60 * 6;

export async function fetchRates(): Promise<RatesPayload> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: SIX_HOURS },
    });
    if (!res.ok) throw new Error(`rates http ${res.status}`);
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== 'success' || !data.rates) throw new Error('rates payload invalid');

    const rates = {} as Record<Currency, number>;
    for (const c of SYMBOLS) {
      const v = data.rates[c];
      rates[c] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : FALLBACK_RATES[c];
    }
    rates.USD = 1;
    return { base: 'USD', rates, fetchedAt: new Date().toISOString(), live: true };
  } catch {
    return { base: 'USD', rates: { ...FALLBACK_RATES }, fetchedAt: new Date().toISOString(), live: false };
  }
}

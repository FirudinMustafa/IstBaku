import type { Currency } from './types';

/**
 * MH-16: Money is handled as INTEGER MINOR UNITS (e.g. cents, kuruş, qəpik)
 * for arithmetic. JavaScript floats are unsafe for currency math; never
 * multiply/divide a Number price directly.
 *
 * Storage convention: the `listings.price` column is integer MAJOR UNITS
 * (whole USD/EUR/TRY/AZN) because the dataset's existing rows assume this.
 * For all CONVERSION and arithmetic we lift up into minor units (×100),
 * operate in BigInt-safe integer space, then round back to the major unit.
 *
 * The exchange rates are still mock — a future ticket should fetch CBRT/CBA
 * rates server-side, cache them, and persist daily snapshots.
 */

// 1 USD = X currency (mock rates — replace with live feed).
export const RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  TRY: 38.6,
  AZN: 1.7,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  TRY: '₺',
  AZN: '₼',
};

/** Minor-unit scale per currency (all 1/100 in our supported set). */
export const MINOR_UNIT_SCALE: Record<Currency, number> = {
  USD: 100,
  EUR: 100,
  TRY: 100,
  AZN: 100,
};

/** Major-unit number → integer minor units. Rejects NaN/Infinity. */
export function toMinorUnits(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount)) return 0;
  const scale = MINOR_UNIT_SCALE[currency];
  return Math.round(amount * scale);
}

/** Integer minor units → number (major units, possibly fractional). */
export function fromMinorUnits(minor: number, currency: Currency): number {
  const scale = MINOR_UNIT_SCALE[currency];
  return Math.round(minor) / scale;
}

/**
 * Convert between currencies using integer-cent math.
 * Returns major units (number) — but the math happens in minor units so
 * sub-cent drift is bounded to a single rounding at the end.
 */
export function convert(amount: number, from: Currency, to: Currency): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const minorFrom = toMinorUnits(amount, from);
  // Convert via USD pivot. Use integer cents on USD side.
  const usdMinor = Math.round(minorFrom / RATES[from]);
  const toMinor = Math.round(usdMinor * RATES[to]);
  return fromMinorUnits(toMinor, to);
}

export function formatPrice(amount: number, currency: Currency, locale = 'tr-TR') {
  if (!Number.isFinite(amount)) amount = 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format integer minor units as a localized currency string. */
export function formatMinorUnits(minor: number, currency: Currency, locale = 'tr-TR'): string {
  return formatPrice(fromMinorUnits(minor, currency), currency, locale);
}

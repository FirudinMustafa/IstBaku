'use client';

import * as React from 'react';
import { Coins, Check } from 'lucide-react';
import { useCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency-store';
import { CURRENCY_SYMBOLS } from '@/lib/currency';
import { useLang } from './LangProvider';
import { cn } from '@/lib/utils';

/**
 * Global currency switcher (PF-01). Mirrors the LangSwitcher pattern:
 * - button shows the active currency code
 * - dropdown lists TRY / USD / EUR / AZN with the symbol
 * - state lives in the CurrencyProvider (localStorage + cookie)
 */
export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useLang();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('currency.change')}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="currency-switcher"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm border border-[color:var(--border)] hover:border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] transition-colors"
      >
        <Coins size={14} />
        <span className="font-medium text-xs">
          <span aria-hidden="true">{CURRENCY_SYMBOLS[currency]} </span>
          {currency}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t('currency.label')}
          className="absolute right-0 top-full mt-1.5 min-w-[160px] glass rounded-xl py-1.5 shadow-xl z-50"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={currency === c}
              onClick={() => { setCurrency(c); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]',
                currency === c && 'text-gold-300',
              )}
            >
              <span>
                <span aria-hidden="true" className="mr-1.5">{CURRENCY_SYMBOLS[c]}</span>
                {c}
              </span>
              {currency === c && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

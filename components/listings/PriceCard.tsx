'use client';

import { TrendingUp } from 'lucide-react';
import type { Property } from '@/lib/types';
import { CURRENCY_SYMBOLS, RATES, convert } from '@/lib/currency';
import { useCurrency } from '@/lib/currency-store';
import { formatNumber } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLang } from '@/components/layout/LangProvider';

const ALL_CURRENCIES = ['USD', 'EUR', 'TRY', 'AZN'] as const;

export function PriceCard({ property: p }: { property: Property }) {
  const { currency: displayCurrency } = useCurrency();
  const { t } = useLang();
  // PF-01: primary display follows the user's chosen currency; the other
  // three currencies are listed underneath as conversions.
  const shownPrice = Math.round(convert(p.price, p.currency, displayCurrency));
  const perSqmInDisplay = p.area.net > 0
    ? Math.round(convert(p.price / p.area.net, p.currency, displayCurrency))
    : 0;
  const grossPerSqmInDisplay = p.area.gross > 0
    ? Math.round(convert(p.price / p.area.gross, p.currency, displayCurrency))
    : 0;
  const yieldPct = p.score.rentYield / 10; // 0-100 → /10 → yıllık %
  const others = ALL_CURRENCIES.filter((c) => c !== displayCurrency);

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--fg-muted)]">{t('price.listPrice')}</div>
            <div className="text-3xl font-bold text-gold-300 mt-0.5">
              {CURRENCY_SYMBOLS[displayCurrency]}{formatNumber(shownPrice)} <span className="text-xs text-[color:var(--fg-muted)] font-medium">{displayCurrency}</span>
            </div>
          </div>
          <Badge variant="success" className="gap-1">
            <TrendingUp size={11} /> {t('price.rentYield')} ~{yieldPct.toFixed(1)}{t('price.perYearPct')}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {others.map((c) => (
            <div key={c} className="rounded-xl border bg-[color:var(--bg-elev)] p-2.5">
              <div className="text-[10px] uppercase text-[color:var(--fg-faint)]">{c}</div>
              <div className="text-sm font-bold mt-0.5">
                {CURRENCY_SYMBOLS[c]}{formatNumber(Math.round(convert(p.price, p.currency, c)))}
              </div>
            </div>
          ))}
        </div>

        {/* m² figures use the display currency for consistency with the headline. */}

        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('price.perSqmNet')}</div>
            <div className="font-bold mt-0.5">
              {CURRENCY_SYMBOLS[displayCurrency]}{formatNumber(perSqmInDisplay)}/m²
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('price.perSqmGross')}</div>
            <div className="font-bold mt-0.5">
              {CURRENCY_SYMBOLS[displayCurrency]}{formatNumber(grossPerSqmInDisplay)}/m²
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('property.netArea')}</div>
            <div className="font-bold mt-0.5">{p.area.net} m²</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('property.grossArea')}</div>
            <div className="font-bold mt-0.5">{p.area.gross} m²</div>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-[color:var(--fg-faint)]">
          {t('price.fxRef')} {RATES.TRY} TRY · {RATES.AZN} AZN · {RATES.EUR} EUR
        </p>
      </CardBody>
    </Card>
  );
}

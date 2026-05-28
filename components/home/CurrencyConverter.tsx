'use client';

import * as React from 'react';
import { ArrowLeftRight, RefreshCw, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input, Label, Select } from '@/components/ui/Input';
import { RATES, CURRENCY_SYMBOLS, convert } from '@/lib/currency';
import type { Currency } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'TRY', 'AZN'];

export function CurrencyConverter() {
  const [amount, setAmount] = React.useState(1000);
  const [from, setFrom] = React.useState<Currency>('USD');
  const [to, setTo] = React.useState<Currency>('TRY');

  const result = convert(amount, from, to);
  const reverseRate = convert(1, to, from);

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      {/* Opak kart — Hero'nun üzerine taşar; saydam (glass) DEĞİL ki hero'daki
          grid çizgileri/koyu zemin yazıların arkasından görünüp çakışmasın. */}
      <div className="rounded-2xl sm:rounded-3xl border border-gold-400/30 bg-[color:var(--bg-card)] shadow-xl shadow-black/10 p-5 sm:p-7">
        {/* Başlık — alt ayraç içerikten net ayrılır, yazı hiçbir çizgiyle çakışmaz */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-4 mb-5 border-b border-[color:var(--border)]">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="gold"><RefreshCw size={11} /> Canlı Kur</Badge>
            <span className="text-xs text-[color:var(--fg-muted)]">Kaynak: CBRT + CBA günlük endeks</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--fg-muted)] tabular-nums">
            <span className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-2 py-1">1 USD = ₺{RATES.TRY}</span>
            <span className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-2 py-1">₼{RATES.AZN}</span>
            <span className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-2 py-1">€{RATES.EUR}</span>
          </div>
        </div>

        {/* Dönüştürücü */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <Label>Tutar</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, +e.target.value))}
                className="flex-1 tabular-nums"
              />
              <Select value={from} onChange={(e) => setFrom(e.target.value as Currency)} className="w-24">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          <button
            onClick={() => { setFrom(to); setTo(from); }}
            aria-label="Para birimlerini değiştir"
            className="size-10 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] text-[color:var(--fg-muted)] hover:bg-gold-400/15 hover:border-gold-400/60 hover:text-gold-500 transition-colors flex items-center justify-center self-end shrink-0"
          >
            <ArrowLeftRight size={16} />
          </button>

          <div>
            <Label>Karşılık</Label>
            <div className="flex gap-2">
              {/* Sonuç: gold vurgulu zemin + yüksek kontrast --fg sayı (light & dark) */}
              <div className="flex-1 h-10 rounded-xl border border-gold-400/40 bg-gold-400/10 flex items-center px-3 font-bold text-[color:var(--fg)] tabular-nums">
                {CURRENCY_SYMBOLS[to]}{formatNumber(Math.round(result))}
              </div>
              <Select value={to} onChange={(e) => setTo(e.target.value as Currency)} className="w-24">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[color:var(--fg-muted)]">
          <TrendingUp size={12} className="text-gold-500 shrink-0" />
          1 <strong className="text-[color:var(--fg)]">{to}</strong> ={' '}
          <strong className="text-[color:var(--fg)] tabular-nums">{reverseRate.toFixed(4)}</strong> {from}
        </p>
      </div>
    </section>
  );
}

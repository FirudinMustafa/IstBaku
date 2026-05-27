'use client';

import * as React from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
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
      <Card glass className="border-gold-400/20">
        <CardBody className="p-5 sm:p-7">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="inline-flex items-center gap-2">
              <Badge variant="gold"><RefreshCw size={11} /> Canlı Kur</Badge>
              <span className="text-xs text-[color:var(--fg-muted)]">Kaynak: CBRT + CBA günlük endeks</span>
            </div>
            <div className="text-[11px] text-[color:var(--fg-faint)]">1 USD = ₺{RATES.TRY} · ₼{RATES.AZN} · €{RATES.EUR}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <Label>Tutar</Label>
              <div className="flex gap-2">
                <Input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, +e.target.value))} className="flex-1" />
                <Select value={from} onChange={(e) => setFrom(e.target.value as Currency)} className="w-24">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>

            <button
              onClick={() => { setFrom(to); setTo(from); }}
              aria-label="Para birimlerini değiştir"
              className="size-10 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] hover:bg-gold-400/10 hover:border-gold-400/60 hover:text-gold-300 transition-colors flex items-center justify-center self-end mb-0 sm:mb-0"
            >
              <ArrowLeftRight size={16} />
            </button>

            <div>
              <Label>Karşılık</Label>
              <div className="flex gap-2">
                <div className="flex-1 h-10 rounded-xl border bg-[color:var(--bg-elev)] flex items-center px-3 text-gold-300 font-bold">
                  {CURRENCY_SYMBOLS[to]}{formatNumber(Math.round(result))}
                </div>
                <Select value={to} onChange={(e) => setTo(e.target.value as Currency)} className="w-24">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-[color:var(--fg-muted)]">
            1 <strong>{to}</strong> = {reverseRate.toFixed(4)} {from}
          </p>
        </CardBody>
      </Card>
    </section>
  );
}

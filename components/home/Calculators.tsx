'use client';

import * as React from 'react';
import { Calculator, RefreshCw, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input, Label, Select } from '@/components/ui/Input';
import { CURRENCY_SYMBOLS, convert } from '@/lib/currency';
import { useCurrency } from '@/lib/currency-store';
import { useLang } from '@/components/layout/LangProvider';
import type { Currency } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'TRY', 'AZN'];

/** Sayısal girişi güvene alır: geçersiz/boş → 0, isteğe bağlı min/max sınırı. */
function num(v: string, min = -Infinity, max = Infinity): number {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return min > -Infinity ? min : 0;
  return Math.min(max, Math.max(min, n));
}
/** Çıktıyı güvene alır: NaN/Infinity → 0. */
function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

export function Calculators() {
  const { t } = useLang();
  const [tab, setTab] = React.useState<'mortgage' | 'fx' | 'yield'>('mortgage');
  return (
    <section id="hesaplayicilar" className="w-full px-4 py-6 sm:py-10 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="gold"><Calculator size={11} /> {t('calc.badge')}</Badge>
        <h2 className="font-display mt-3 text-2xl sm:text-4xl font-bold tracking-tight">{t('calc.heading')}</h2>
      </div>

      <div className="mt-6 sm:mt-8 grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 overflow-x-auto">
          {[
            { k: 'mortgage', l: t('calc.mortgage'), i: Calculator },
            { k: 'fx', l: t('calc.currency'), i: RefreshCw },
            { k: 'yield', l: t('calc.yield'), i: TrendingUp },
          ].map((tab2) => (
            <button
              key={tab2.k}
              onClick={() => setTab(tab2.k as typeof tab)}
              className={`flex flex-col lg:flex-row items-center lg:gap-3 gap-1 px-2 lg:px-4 py-3 rounded-xl text-center lg:text-left transition-colors border ${
                tab === tab2.k
                  ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                  : 'border-[color:var(--border)] bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card-hover)]'
              }`}
            >
              <tab2.i size={16} />
              <span className="font-medium text-xs lg:text-sm">{tab2.l}</span>
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-8">
          {tab === 'mortgage' && <Mortgage />}
          {tab === 'fx' && <FX />}
          {tab === 'yield' && <Yield />}
        </div>
      </div>
    </section>
  );
}

function Mortgage() {
  const { t } = useLang();
  const [price, setPrice] = React.useState(500000);
  const [down, setDown] = React.useState(20);
  const [years, setYears] = React.useState(20);
  // Aylık faiz (bölge geleneği). Boş/0 girilirse faizsiz eşit taksit hesaplanır.
  const [rate, setRate] = React.useState(1.7);

  const principal = safe(price * (1 - down / 100));
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = rate / 100;
  const monthly = safe(
    principal === 0 || monthlyRate <= 0
      ? principal / months
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1),
  );
  const total = safe(monthly * months);
  const interest = safe(total - principal);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label>{t('calc.m.price')}</Label><Input type="number" min={0} value={price} onChange={(e) => setPrice(num(e.target.value, 0))} /></div>
        <div><Label>{t('calc.m.down')}</Label><Input type="number" min={0} max={100} value={down} onChange={(e) => setDown(num(e.target.value, 0, 100))} /></div>
        <div><Label>{t('calc.m.term')}</Label><Input type="number" min={1} max={40} value={years} onChange={(e) => setYears(num(e.target.value, 1, 40))} /></div>
        <div><Label>{t('calc.m.rate')}</Label><Input type="number" step="0.05" min={0} value={rate} onChange={(e) => setRate(num(e.target.value, 0, 20))} /></div>
      </div>
      <div className="rounded-2xl border bg-[color:var(--bg-elev)] p-5 flex flex-col justify-center">
        <div className="text-xs uppercase text-[color:var(--fg-muted)]">{t('calc.m.monthly')}</div>
        <div className="text-4xl font-bold text-gold-300 mt-1">${formatNumber(Math.round(monthly))}</div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border bg-[color:var(--bg-card)] p-3">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('calc.m.loan')}</div>
            <div className="font-bold">${formatNumber(Math.round(principal))}</div>
          </div>
          <div className="rounded-xl border bg-[color:var(--bg-card)] p-3">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('calc.m.interest')}</div>
            <div className="font-bold">${formatNumber(Math.round(interest))}</div>
          </div>
          <div className="rounded-xl border bg-[color:var(--bg-card)] p-3 col-span-2">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{t('calc.m.total')}</div>
            <div className="font-bold">${formatNumber(Math.round(total))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FX() {
  const { t } = useLang();
  const { rates } = useCurrency(); // canlı kur gelince yeniden hesaplar
  const [amount, setAmount] = React.useState(100000);
  const [from, setFrom] = React.useState<Currency>('USD');
  void rates;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label>{t('calc.fx.amount')}</Label><Input type="number" min={0} value={amount} onChange={(e) => setAmount(num(e.target.value, 0))} /></div>
        <div><Label>{t('currency.label')}</Label>
          <Select value={from} onChange={(e) => setFrom(e.target.value as Currency)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} {CURRENCY_SYMBOLS[c]}</option>)}
          </Select>
        </div>
        <div className="text-xs text-[color:var(--fg-muted)]">{t('calc.fx.note')}</div>
      </div>
      <div className="rounded-2xl border bg-[color:var(--bg-elev)] p-5 grid grid-cols-2 gap-3">
        {CURRENCIES.filter((c) => c !== from).map((to) => (
          <div key={to} className="rounded-xl border bg-[color:var(--bg-card)] p-3">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{to}</div>
            <div className="text-lg font-bold text-gold-300">
              {CURRENCY_SYMBOLS[to]} {formatNumber(Math.round(convert(amount, from, to)))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Yield() {
  const { t } = useLang();
  const [price, setPrice] = React.useState(300000);
  const [monthlyRent, setMonthlyRent] = React.useState(1500);
  const [expense, setExpense] = React.useState(10);
  const annual = safe(monthlyRent * 12 * (1 - expense / 100));
  const gross = price > 0 ? safe(((monthlyRent * 12) / price) * 100) : 0;
  const net = price > 0 ? safe((annual / price) * 100) : 0;
  const payback = annual > 0 ? safe(price / annual) : 0;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label>{t('calc.y.price')}</Label><Input type="number" min={0} value={price} onChange={(e) => setPrice(num(e.target.value, 0))} /></div>
        <div><Label>{t('calc.y.rent')}</Label><Input type="number" min={0} value={monthlyRent} onChange={(e) => setMonthlyRent(num(e.target.value, 0))} /></div>
        <div><Label>{t('calc.y.expense')}</Label><Input type="number" min={0} max={100} value={expense} onChange={(e) => setExpense(num(e.target.value, 0, 100))} /></div>
      </div>
      <div className="rounded-2xl border bg-[color:var(--bg-elev)] p-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase text-[color:var(--fg-muted)]">{t('calc.y.gross')}</div>
          <div className="text-3xl font-bold text-gold-300">{gross.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-xs uppercase text-[color:var(--fg-muted)]">{t('calc.y.net')}</div>
          <div className="text-3xl font-bold text-success">{net.toFixed(2)}%</div>
        </div>
        <div className="col-span-2 text-sm pt-3 border-t">
          {t('calc.y.income')}: <span className="font-bold">${formatNumber(Math.round(annual))}</span> · {t('calc.y.payback')}: <span className="font-bold">{payback > 0 ? `${payback.toFixed(1)} ${t('calc.y.years')}` : '—'}</span>
        </div>
      </div>
    </div>
  );
}

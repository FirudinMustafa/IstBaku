'use client';

import * as React from 'react';
import { Calculator, RefreshCw, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input, Label, Select } from '@/components/ui/Input';
import { RATES, CURRENCY_SYMBOLS, convert } from '@/lib/currency';
import type { Currency } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

export function Calculators() {
  const [tab, setTab] = React.useState<'mortgage' | 'fx' | 'yield'>('mortgage');
  return (
    <section id="hesaplayicilar" className="w-full px-4 py-6 sm:py-10 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="gold"><Calculator size={11} /> Hesaplayıcılar</Badge>
        <h2 className="font-display mt-3 text-2xl sm:text-4xl font-bold tracking-tight">Karar vermeden önce hesapla</h2>
      </div>

      <div className="mt-6 sm:mt-8 grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 overflow-x-auto">
          {[
            { k: 'mortgage', l: 'Konut Kredisi', i: Calculator },
            { k: 'fx', l: 'Çapraz Kur', i: RefreshCw },
            { k: 'yield', l: 'Kira Getirisi', i: TrendingUp },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`flex flex-col lg:flex-row items-center lg:gap-3 gap-1 px-2 lg:px-4 py-3 rounded-xl text-center lg:text-left transition-colors border ${
                tab === t.k
                  ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                  : 'border-[color:var(--border)] bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card-hover)]'
              }`}
            >
              <t.i size={16} />
              <span className="font-medium text-xs lg:text-sm">{t.l}</span>
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
  const [price, setPrice] = React.useState(500000);
  const [down, setDown] = React.useState(20);
  const [years, setYears] = React.useState(20);
  const [rate, setRate] = React.useState(1.7);

  const principal = price * (1 - down / 100);
  const months = years * 12;
  const monthlyRate = rate / 100;
  const monthly = principal === 0 || monthlyRate === 0
    ? principal / months
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const total = monthly * months;
  const interest = total - principal;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label>Konut Fiyatı (USD)</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
        <div><Label>Peşinat (%)</Label><Input type="number" value={down} onChange={(e) => setDown(+e.target.value)} /></div>
        <div><Label>Vade (yıl)</Label><Input type="number" value={years} onChange={(e) => setYears(+e.target.value)} /></div>
        <div><Label>Aylık Faiz (%)</Label><Input type="number" step="0.05" value={rate} onChange={(e) => setRate(+e.target.value)} /></div>
      </div>
      <div className="rounded-2xl border bg-[color:var(--bg-elev)] p-5 flex flex-col justify-center">
        <div className="text-xs uppercase text-[color:var(--fg-muted)]">Aylık Taksit</div>
        <div className="text-4xl font-bold text-gold-300 mt-1">${formatNumber(Math.round(monthly))}</div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border bg-[color:var(--bg-card)] p-3">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">Kredi Tutarı</div>
            <div className="font-bold">${formatNumber(Math.round(principal))}</div>
          </div>
          <div className="rounded-xl border bg-[color:var(--bg-card)] p-3">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">Toplam Faiz</div>
            <div className="font-bold">${formatNumber(Math.round(interest))}</div>
          </div>
          <div className="rounded-xl border bg-[color:var(--bg-card)] p-3 col-span-2">
            <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">Toplam Geri Ödeme</div>
            <div className="font-bold">${formatNumber(Math.round(total))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FX() {
  const [amount, setAmount] = React.useState(100000);
  const [from, setFrom] = React.useState<Currency>('USD');
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label>Tutar</Label><Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
        <div><Label>Para birimi</Label>
          <Select value={from} onChange={(e) => setFrom(e.target.value as Currency)}>
            {(Object.keys(RATES) as Currency[]).map((c) => <option key={c} value={c}>{c} {CURRENCY_SYMBOLS[c]}</option>)}
          </Select>
        </div>
        <div className="text-xs text-[color:var(--fg-muted)]">* Kurlar CBRT + CBA günlük endeksinden alınır.</div>
      </div>
      <div className="rounded-2xl border bg-[color:var(--bg-elev)] p-5 grid grid-cols-2 gap-3">
        {(Object.keys(RATES) as Currency[]).filter((c) => c !== from).map((to) => (
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
  const [price, setPrice] = React.useState(300000);
  const [monthlyRent, setMonthlyRent] = React.useState(1500);
  const [expense, setExpense] = React.useState(10);
  const annual = monthlyRent * 12 * (1 - expense / 100);
  const gross = ((monthlyRent * 12) / price) * 100;
  const net = (annual / price) * 100;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label>Konut Bedeli (USD)</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
        <div><Label>Aylık Kira (USD)</Label><Input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(+e.target.value)} /></div>
        <div><Label>Yıllık Gider (%)</Label><Input type="number" value={expense} onChange={(e) => setExpense(+e.target.value)} /></div>
      </div>
      <div className="rounded-2xl border bg-[color:var(--bg-elev)] p-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase text-[color:var(--fg-muted)]">Brüt Yield</div>
          <div className="text-3xl font-bold text-gold-300">{gross.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-xs uppercase text-[color:var(--fg-muted)]">Net Yield</div>
          <div className="text-3xl font-bold text-success">{net.toFixed(2)}%</div>
        </div>
        <div className="col-span-2 text-sm pt-3 border-t">
          Yıllık net gelir: <span className="font-bold">${formatNumber(Math.round(annual))}</span> · Geri ödeme süresi (kabaca): <span className="font-bold">{(price / annual).toFixed(1)} yıl</span>
        </div>
      </div>
    </div>
  );
}

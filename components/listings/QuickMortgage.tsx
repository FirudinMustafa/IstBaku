'use client';

import * as React from 'react';
import { Compass } from 'lucide-react';
import type { Property } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { CURRENCY_SYMBOLS } from '@/lib/currency';
import { formatNumber } from '@/lib/utils';

export function QuickMortgage({ property: p }: { property: Property }) {
  const [downPct, setDownPct] = React.useState(20);
  const [years, setYears] = React.useState(20);
  const [ratePct, setRatePct] = React.useState(1.7); // aylık faiz

  const principal = p.price * (1 - downPct / 100);
  const months = years * 12;
  const r = ratePct / 100;
  const monthly =
    principal === 0 || r === 0
      ? principal / Math.max(months, 1)
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = monthly * months;
  const interest = total - principal;
  const sym = CURRENCY_SYMBOLS[p.currency];

  return (
    <Card>
      <CardBody>
        <h3 className="font-semibold mb-1 inline-flex items-center gap-2"><Compass size={15} /> Hızlı kredi hesaplama</h3>
        <p className="text-xs text-[color:var(--fg-muted)] mb-4">İlanın fiyatı otomatik dolduruldu. Aşağıdan peşinat / vade / faiz ayarla.</p>

        <div className="rounded-xl bg-[color:var(--bg-elev)] border p-3 mb-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-[color:var(--fg-muted)]">Konut bedeli</span>
            <span className="font-bold">{sym}{formatNumber(p.price)}</span>
          </div>
        </div>

        <Slider label="Peşinat" value={downPct} min={0} max={80} step={5} unit="%" onChange={setDownPct} />
        <Slider label="Vade" value={years} min={1} max={30} step={1} unit=" yıl" onChange={setYears} />
        <Slider label="Aylık faiz" value={ratePct} min={0.5} max={4} step={0.05} unit="%" onChange={setRatePct} decimals={2} />

        <div className="mt-4 rounded-2xl border bg-gradient-to-br from-gold-400/15 to-transparent p-4">
          <div className="text-xs text-[color:var(--fg-muted)]">Tahmini aylık taksit</div>
          <div className="text-3xl font-bold text-gold-300 mt-0.5">{sym}{formatNumber(Math.round(monthly))}</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <Stat l="Kredi" v={`${sym}${formatNumber(Math.round(principal))}`} />
          <Stat l="Toplam Faiz" v={`${sym}${formatNumber(Math.round(interest))}`} />
          <Stat l="Toplam Ödeme" v={`${sym}${formatNumber(Math.round(total))}`} />
        </div>
      </CardBody>
    </Card>
  );
}

function Slider({
  label, value, min, max, step, unit, onChange, decimals = 0,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; decimals?: number;
}) {
  return (
    <label className="block mb-3">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-[color:var(--fg-muted)]">{label}</span>
        <span className="font-bold text-gold-300">{value.toFixed(decimals)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-gold-400 cursor-pointer"
      />
    </label>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-xl border bg-[color:var(--bg-elev)] p-2.5">
      <div className="text-[10px] uppercase text-[color:var(--fg-muted)]">{l}</div>
      <div className="font-bold text-xs mt-0.5">{v}</div>
    </div>
  );
}

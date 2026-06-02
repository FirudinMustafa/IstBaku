'use client';

import * as React from 'react';
import { Compass } from 'lucide-react';
import type { Property } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { CURRENCY_SYMBOLS } from '@/lib/currency';
import { useLang } from '@/components/layout/LangProvider';
import { formatNumber } from '@/lib/utils';

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export function QuickMortgage({ property: p }: { property: Property }) {
  const { t } = useLang();
  const [downPct, setDownPct] = React.useState(20);
  const [years, setYears] = React.useState(20);
  const [ratePct, setRatePct] = React.useState(1.7); // aylık faiz

  const principal = safe(p.price * (1 - downPct / 100));
  const months = Math.max(1, years * 12);
  const r = ratePct / 100;
  const monthly = safe(
    principal === 0 || r <= 0
      ? principal / months
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1),
  );
  const total = safe(monthly * months);
  const interest = safe(total - principal);
  const sym = CURRENCY_SYMBOLS[p.currency];

  return (
    <Card>
      <CardBody>
        <h3 className="font-semibold mb-1 inline-flex items-center gap-2"><Compass size={15} /> {t('mortgage.quick')}</h3>
        <p className="text-xs text-[color:var(--fg-muted)] mb-4">{t('mortgage.quick.note')}</p>

        <div className="rounded-xl bg-[color:var(--bg-elev)] border p-3 mb-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-[color:var(--fg-muted)]">{t('mortgage.price')}</span>
            <span className="font-bold">{sym}{formatNumber(p.price)}</span>
          </div>
        </div>

        <Slider label={t('calc.m.down')} value={downPct} min={0} max={80} step={5} unit="%" onChange={setDownPct} />
        <Slider label={t('calc.m.term')} value={years} min={1} max={30} step={1} unit={` ${t('calc.y.years')}`} onChange={setYears} />
        <Slider label={t('mortgage.rate')} value={ratePct} min={0.5} max={4} step={0.05} unit="%" onChange={setRatePct} decimals={2} />

        <div className="mt-4 rounded-2xl border bg-gradient-to-br from-gold-400/15 to-transparent p-4">
          <div className="text-xs text-[color:var(--fg-muted)]">{t('mortgage.estimated')}</div>
          <div className="text-3xl font-bold text-gold-300 mt-0.5">{sym}{formatNumber(Math.round(monthly))}</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <Stat l={t('calc.m.loan')} v={`${sym}${formatNumber(Math.round(principal))}`} />
          <Stat l={t('calc.m.interest')} v={`${sym}${formatNumber(Math.round(interest))}`} />
          <Stat l={t('calc.m.total')} v={`${sym}${formatNumber(Math.round(total))}`} />
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

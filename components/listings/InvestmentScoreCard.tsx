'use client';

import * as React from 'react';
import { Sparkles, ChevronDown, Info } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from './ScoreRing';
import { useLang } from '@/components/layout/LangProvider';
import type { Property } from '@/lib/types';

export function InvestmentScoreCard({ property: p }: { property: Property }) {
  const { t } = useLang();
  const [open, setOpen] = React.useState(true);
  const total10 = (p.score.total / 10).toFixed(1);

  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex items-center gap-5 border-b">
        <ScoreRing value={p.score.total} size={84} stroke={6} outOf={10} />
        <div className="flex-1">
          <Badge variant="ai" className="mb-1.5"><Sparkles size={11} /> {t('score.title')}</Badge>
          <div className="text-2xl font-bold">
            {total10} <span className="text-sm text-[color:var(--fg-muted)] font-medium">/ 10</span>
          </div>
          <p className="text-xs text-[color:var(--fg-muted)] mt-1">{p.score.reasoning}</p>
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-sm hover:bg-[color:var(--bg-card-hover)]"
      >
        <span className="inline-flex items-center gap-2 text-[color:var(--fg-muted)]">
          <Info size={13} /> {t('score.how')}
        </span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <CardBody className="border-t space-y-3">
          {[
            { l: t('score.location'), v: p.score.region, d: t('score.locationDesc') },
            { l: t('score.price'), v: p.score.price, d: t('score.priceDesc') },
            { l: t('score.rent'), v: p.score.rentYield, d: t('score.rentDesc') },
            { l: t('score.demand'), v: p.score.demand, d: t('score.demandDesc') },
          ].map((m) => (
            <div key={m.l}>
              {/* Mobil-dostu: etiket + skor üst satır, açıklama kendi satırında (Tur6 #1e) */}
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{m.l}</span>
                <span className="font-bold text-gold-300 tabular-nums shrink-0">{(m.v / 10).toFixed(1)} / 10</span>
              </div>
              <div className="text-xs text-[color:var(--fg-faint)] mt-0.5">{m.d}</div>
              <div className="h-1.5 rounded-full bg-[color:var(--bg-card-hover)] mt-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold-400 to-gold-300 transition-[width] duration-1000" style={{ width: `${m.v}%` }} />
              </div>
            </div>
          ))}
        </CardBody>
      )}
    </Card>
  );
}

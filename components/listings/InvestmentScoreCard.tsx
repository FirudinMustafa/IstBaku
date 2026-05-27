'use client';

import * as React from 'react';
import { Sparkles, ChevronDown, Info } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from './ScoreRing';
import type { Property } from '@/lib/types';

export function InvestmentScoreCard({ property: p }: { property: Property }) {
  const [open, setOpen] = React.useState(true);
  const total10 = (p.score.total / 10).toFixed(1);

  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex items-center gap-5 border-b">
        <ScoreRing value={p.score.total} size={84} stroke={6} outOf={10} />
        <div className="flex-1">
          <Badge variant="ai" className="mb-1.5"><Sparkles size={11} /> AI Yatırım Skoru</Badge>
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
          <Info size={13} /> Skor nasıl hesaplandı?
        </span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <CardBody className="border-t space-y-3">
          {[
            { l: 'Konum puanı', v: p.score.region, d: 'Bölge talep yoğunluğu + demografi' },
            { l: 'Fiyat uygunluğu', v: p.score.price, d: 'Bölge ortalamasıyla kıyaslama' },
            { l: 'Kira getirisi', v: p.score.rentYield, d: 'Beklenen yıllık brüt yield' },
            { l: 'Piyasa talebi', v: p.score.demand, d: 'Yabancı yatırımcı ilgisi dahil' },
          ].map((m) => (
            <div key={m.l}>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{m.l}</span>
                  <span className="ml-2 text-xs text-[color:var(--fg-faint)]">{m.d}</span>
                </div>
                <span className="font-bold text-gold-300 tabular-nums">{(m.v / 10).toFixed(1)} / 10</span>
              </div>
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

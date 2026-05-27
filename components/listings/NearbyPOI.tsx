'use client';

import { Train, GraduationCap, Building2, ShoppingBag, Trees, Store, Pill, UtensilsCrossed } from 'lucide-react';
import type { NearbyPOI as POI, POIEntry } from '@/lib/types';

const ICONS = {
  metro:   { i: Train,            l: 'Metro',   color: 'text-navy-300' },
  okul:    { i: GraduationCap,    l: 'Okul',    color: 'text-success' },
  hastane: { i: Building2,        l: 'Hastane', color: 'text-danger' },
  avm:     { i: ShoppingBag,      l: 'AVM',     color: 'text-gold-300' },
  park:    { i: Trees,            l: 'Park',    color: 'text-success' },
  market:  { i: Store,            l: 'Market',  color: 'text-navy-300' },
  eczane:  { i: Pill,             l: 'Eczane',  color: 'text-danger' },
  eglence: { i: UtensilsCrossed,  l: 'Restoran/Cafe', color: 'text-gold-300' },
} as const;

type Key = keyof typeof ICONS;

function asArray(v: POIEntry | POIEntry[] | undefined): POIEntry[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export function NearbyPOIList({ nearby }: { nearby: POI }) {
  type Item = { k: Key; idx?: number; data: POIEntry };
  const items: Item[] = [];
  (Object.keys(ICONS) as Key[]).forEach((k) => {
    const v = nearby[k];
    if (!v) return;
    if (k === 'market') {
      asArray(v as POIEntry | POIEntry[]).forEach((entry, idx) => items.push({ k, idx, data: entry }));
    } else {
      items.push({ k, data: v as POIEntry });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {items.map(({ k, idx, data }) => {
        const meta = ICONS[k];
        return (
          <div key={`${k}-${idx ?? 0}-${data.name}`} className="rounded-xl border bg-[color:var(--bg-elev)] p-3 flex items-center gap-3">
            <div className={`size-9 rounded-lg bg-[color:var(--bg-card)] flex items-center justify-center ${meta.color}`}>
              <meta.i size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--fg-muted)]">{meta.l}</div>
              <div className="text-sm font-semibold truncate">{data.name}</div>
              <div className="text-[11px] text-[color:var(--fg-faint)]">
                {data.minutes} dk · {data.km.toFixed(1)} km
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

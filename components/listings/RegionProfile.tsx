'use client';

import { Users, Briefcase, GraduationCap, Globe } from 'lucide-react';
import type { RegionProfile as RP } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { useLang } from '@/components/layout/LangProvider';

const ROWS = [
  { k: 'aile' as const, icon: Users, color: '#CAAE99' },
  { k: 'memur' as const, icon: Briefcase, color: '#6366f1' },
  { k: 'ogrenci' as const, icon: GraduationCap, color: '#10b981' },
  { k: 'yabanci' as const, icon: Globe, color: '#7e9fcb' },
];

export function RegionProfileCard({ profile, district, city }: { profile: RP; district: string; city: string }) {
  const { t } = useLang();
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{t('region.title')}</h3>
          <span className="text-xs text-[color:var(--fg-muted)]">{city} / {district}</span>
        </div>
        <p className="text-xs text-[color:var(--fg-muted)] mb-4">{t('region.note')}</p>

        <div className="space-y-3">
          {ROWS.map((r) => {
            const v = profile[r.k];
            return (
              <div key={r.k}>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <r.icon size={14} style={{ color: r.color }} />
                    {t(`enums.demographic.${r.k}`)}
                  </span>
                  <span className="font-bold tabular-nums">%{v}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[color:var(--bg-card-hover)] mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v}%`, background: r.color }} />
                </div>
              </div>
            );
          })}
          {profile.diger > 0 && (
            <div className="text-[11px] text-[color:var(--fg-faint)]">{t('region.other')} %{profile.diger}</div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

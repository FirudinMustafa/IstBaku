'use client';

import { ShieldCheck } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useLang } from '@/components/layout/LangProvider';

/**
 * "İstBaku Onaylı" — sadece rozet (ikon); üzerine gelince/odaklanınca açıklama
 * tooltip'i çıkar. Yazı yok (Tur6 #1b).
 */
export function ApprovedBadge({ size = 14 }: { size?: number }) {
  const { t } = useLang();
  return (
    <Tooltip content={t('badge.approved.tooltip')} side="bottom">
      <span
        aria-label={t('property.approved')}
        className="inline-flex items-center justify-center size-6 rounded-full bg-success/20 text-success border border-success/40"
      >
        <ShieldCheck size={size} />
      </span>
    </Tooltip>
  );
}

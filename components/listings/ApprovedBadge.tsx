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
        className="inline-flex items-center justify-center size-7 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 border border-gold-200/70 ring-2 ring-gold-400/30 shadow-[0_2px_8px_-1px_rgba(212,168,67,0.6)]"
      >
        <ShieldCheck size={size} strokeWidth={2.5} />
      </span>
    </Tooltip>
  );
}

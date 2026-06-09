'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useLang } from '@/components/layout/LangProvider';

/**
 * İlan detayı (ve benzeri alt sayfalar) için sol üstte "Geri" butonu.
 * router.back() ile bir önceki sayfaya döner; geçmiş yoksa fallback'e gider.
 */
export function BackButton({ fallback = '/listings', label }: { fallback?: string; label?: string }) {
  const router = useRouter();
  const { t } = useLang();
  const text = label ?? t('common.back');

  function onBack() {
    // Tarayıcı geçmişi varsa geri dön; yoksa (örn. dışarıdan direkt giriş) listelere git.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={text}
      className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-2.5 py-1.5 text-sm font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:border-[color:var(--border-strong)] transition-colors"
    >
      <ChevronLeft size={16} /> {text}
    </button>
  );
}

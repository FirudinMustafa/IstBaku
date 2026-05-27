'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GitCompare, X, ArrowRight } from 'lucide-react';
import { useCompare, MAX_COMPARE } from '@/lib/compare-store';
import { cn } from '@/lib/utils';

export function CompareFloatingBar() {
  const pathname = usePathname();
  const compare = useCompare();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (compare.count === 0) return null;
  // Karşılaştırma sayfasında zaten gizle
  if (pathname.startsWith('/compare')) return null;

  return (
    <div
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-[55]',
        'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6',
      )}
    >
      <div className="glass rounded-2xl border border-gold-400/40 shadow-2xl px-3 py-2 flex items-center gap-2 sm:gap-3">
        <div className="inline-flex items-center gap-1.5 text-sm">
          <GitCompare size={15} className="text-gold-300" />
          <span className="font-semibold">{compare.count}</span>
          <span className="text-[color:var(--fg-muted)] text-xs hidden sm:inline">/ {MAX_COMPARE} seçili</span>
        </div>
        <button
          type="button"
          onClick={() => compare.clear()}
          aria-label="Karşılaştırma listesini temizle"
          className="touch-target min-h-11 min-w-11 -m-1 p-1 rounded-lg hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center text-[color:var(--fg-muted)]"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <Link
          href="/compare"
          aria-disabled={compare.count < 2}
          tabIndex={compare.count < 2 ? -1 : undefined}
          className={cn(
            'h-11 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold text-sm transition-all touch-target',
            compare.count >= 2
              ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 active:scale-95 shadow-[0_4px_12px_-2px_rgba(202,174,153,0.5)]'
              : 'bg-[color:var(--bg-elev)] text-[color:var(--fg-muted)] cursor-not-allowed pointer-events-none',
          )}
        >
          Karşılaştır <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

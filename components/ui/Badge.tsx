import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'gold' | 'navy' | 'danger' | 'outline' | 'ai' | 'premium';

const VARIANT: Record<Variant, string> = {
  default: 'bg-[color:var(--bg-card-hover)] text-[color:var(--fg)] border',
  success: 'bg-success/15 text-success border border-success/30',
  /* "gold" rozeti artık birincil aksan: Sky/Cyan */
  gold: 'bg-gold-400/15 text-gold-300 border border-gold-400/30',
  /* Sıcak Premium rozeti — sıcak amber ton, gold-tier ayrımı için */
  premium: 'bg-amber-400/15 text-amber-300 border border-amber-400/40',
  navy: 'bg-navy-500/15 text-navy-300 border border-navy-500/30',
  danger: 'bg-danger/15 text-danger border border-danger/30',
  outline: 'border border-[color:var(--border-strong)] text-[color:var(--fg-muted)]',
  ai: 'bg-gradient-to-r from-gold-400/20 to-navy-500/20 text-gold-300 border border-gold-400/40',
};

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}

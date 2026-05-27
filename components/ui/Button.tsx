import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[color:var(--fg)] text-[color:var(--bg)] hover:opacity-90 shadow-sm',
  secondary:
    'bg-[color:var(--bg-elev)] text-[color:var(--fg)] border hover:bg-[color:var(--bg-card-hover)]',
  ghost:
    'text-[color:var(--fg)] hover:bg-[color:var(--bg-card-hover)]',
  outline:
    'border border-[color:var(--border-strong)] text-[color:var(--fg)] hover:bg-[color:var(--bg-card-hover)]',
  gold:
    'bg-gold-400 text-navy-900 hover:bg-gold-300 shadow-[0_8px_24px_-8px_rgba(212,168,67,0.6)]',
  danger:
    'bg-danger text-white hover:opacity-90',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          VARIANT[variant],
          SIZE[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block size-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

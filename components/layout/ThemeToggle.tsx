'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Tema değiştir"
      className={cn(
        'inline-flex items-center justify-center size-9 rounded-xl',
        'border border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
        'bg-[color:var(--bg-elev)] transition-all hover:scale-105',
        className,
      )}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Sparkles, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/layout/LangProvider';

const TABS = [
  { href: '/', k: 'nav.home', i: Home, match: (p: string) => p === '/' },
  { href: '/listings', k: 'common.search', i: Search, match: (p: string) => p.startsWith('/listings') || p.startsWith('/property') },
  { href: '/ai-match', k: 'nav.ai_match', i: Sparkles, match: (p: string) => p.startsWith('/ai-match'), accent: true },
  { href: '/dashboard?tab=favorites', k: 'nav.favorites', i: Heart, match: (p: string) => p.startsWith('/dashboard') },
  { href: '/auth/sign-in', k: 'nav.account', i: User, match: (p: string) => p.startsWith('/auth') || p.startsWith('/dashboard') },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  // body class for content padding
  React.useEffect(() => {
    document.body.classList.add('has-bottom-nav');
    return () => document.body.classList.remove('has-bottom-nav');
  }, []);

  return (
    <nav
      aria-label={t('nav.mobileLabel')}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[color:var(--bg-elev)]/95 backdrop-blur-xl border-t border-[color:var(--border)] pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={t(tab.k)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform touch-target',
                active ? 'text-gold-300' : 'text-[color:var(--fg-muted)]',
              )}
            >
              {tab.accent ? (
                <span className={cn(
                  'size-10 rounded-2xl flex items-center justify-center mb-0.5',
                  active
                    ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 shadow-[0_4px_16px_-4px_rgba(212,168,67,0.7)]'
                    : 'bg-gradient-to-br from-gold-300/40 to-gold-500/40 text-gold-300',
                )}>
                  <tab.i size={18} />
                </span>
              ) : (
                <tab.i size={20} className={active ? 'fill-gold-300/10' : ''} />
              )}
              <span className={cn('text-[10px] font-medium', active && 'font-bold')}>
                {t(tab.k)}
              </span>
              {active && !tab.accent && (
                <span className="absolute top-1 h-0.5 w-7 bg-gold-400 rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

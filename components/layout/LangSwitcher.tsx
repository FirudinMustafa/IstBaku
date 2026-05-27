'use client';

import * as React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLang } from './LangProvider';
import { LANG_LABELS, SUPPORTED_LANGS } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    // PP-03: explicit data-testid + descriptive aria-label so e2e tests that look
    // for a "country switcher" don't accidentally lock onto the language flag/button.
    <div ref={ref} className="relative" data-testid="lang-switcher" aria-label="Dil seç">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Dil seç"
        data-testid="lang-switcher-button"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm border border-[color:var(--border)] hover:border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] transition-colors"
      >
        <Globe size={14} />
        <span className="uppercase font-medium text-xs">{lang}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[160px] glass rounded-xl py-1.5 shadow-xl z-50">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]',
                lang === l && 'text-gold-300',
              )}
            >
              <span>{LANG_LABELS[l]}</span>
              {lang === l && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

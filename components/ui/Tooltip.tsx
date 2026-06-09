'use client';

import * as React from 'react';

/**
 * Kütüphanesiz, erişilebilir tooltip. Masaüstünde hover/focus, mobilde tıklayınca
 * açılır. `content` metin/JSX; `children` tetikleyici eleman.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  return (
    <span
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 rounded-full"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`absolute z-50 left-1/2 -translate-x-1/2 w-64 max-w-[80vw] rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-3 py-2 text-[11px] leading-relaxed text-[color:var(--fg)] shadow-2xl ${
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

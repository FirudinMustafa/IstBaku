'use client';

import * as React from 'react';

interface FocusTrapProps {
  /** Whether the trap is active (e.g. dialog open). */
  active?: boolean;
  /** Children rendered inside the trap container. */
  children: React.ReactNode;
  /** Optional className for the wrapper. */
  className?: string;
  /** Called when ESC is pressed inside the trap (optional convenience). */
  onEscape?: () => void;
  /** Return focus to this element on unmount. Defaults to document.activeElement at mount. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** If true, do not move focus on mount (e.g. when child controls initial focus itself). */
  skipInitialFocus?: boolean;
}

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  return nodes.filter((n) => !n.hasAttribute('disabled') && n.tabIndex !== -1 && n.offsetParent !== null);
}

/**
 * FocusTrap — captures focus on mount, returns focus on unmount, traps Tab.
 * Use to wrap Modal/BottomSheet/Drawer/Lightbox/ChatBot dialog content.
 */
export function FocusTrap({
  active = true,
  children,
  className,
  onEscape,
  returnFocusRef,
  skipInitialFocus,
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;

    const container = containerRef.current;
    if (!container) return;

    // Move focus into the trap.
    if (!skipInitialFocus) {
      const focusables = getFocusable(container);
      const first = focusables[0] ?? container;
      // If container is not natively focusable, give it tabIndex -1 so we can focus it.
      if (focusables.length === 0 && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
      }
      // Defer to next tick so animations / mounts settle.
      requestAnimationFrame(() => first.focus());
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!container) return;
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Return focus to the previously focused element (or the provided ref).
      const target = returnFocusRef?.current ?? previouslyFocused.current;
      if (target && typeof target.focus === 'function') {
        try { target.focus(); } catch { /* noop */ }
      }
    };
  }, [active, onEscape, returnFocusRef, skipInitialFocus]);

  // Use `display: contents` by default so the wrapper does not affect layout —
  // children behave as direct children of FocusTrap's parent.
  return (
    <div ref={containerRef} className={className} style={className ? undefined : { display: 'contents' }}>
      {children}
    </div>
  );
}

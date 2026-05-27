'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusTrap } from './FocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Footer slot (sticky at bottom) */
  footer?: React.ReactNode;
  /** Maks yükseklik: '90vh' default */
  maxHeight?: string;
  /** Hide on desktop (default: true). */
  mobileOnly?: boolean;
  /** Optional aria-label when there is no visible title. */
  ariaLabel?: string;
}

export function BottomSheet({
  open, onClose, title, children, footer, maxHeight = '92vh', mobileOnly = true, ariaLabel,
}: Props) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Drag-to-close
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startYRef = React.useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    setDragging(false);
    if (dragY > 80) onClose();
    setDragY(0);
  }

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 z-[80]', mobileOnly && 'md:hidden')}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <FocusTrap active={open} onEscape={onClose}>
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={!title ? ariaLabel : undefined}
          className={cn(
            'absolute bottom-0 inset-x-0 bg-[color:var(--bg-card)] border-t border-[color:var(--border-strong)] shadow-2xl',
            'rounded-t-3xl flex flex-col safe-bottom',
          )}
          style={{
            maxHeight,
            transform: `translateY(${dragY}px)`,
            transition: dragging ? 'none' : 'transform 200ms ease-out',
          }}
        >
          {/* Drag handle */}
          <div
            className="pt-2.5 pb-1 flex justify-center cursor-grab touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            aria-hidden="true"
          >
            <div className="h-1.5 w-12 rounded-full bg-[color:var(--border-strong)]" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b">
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="touch-target min-h-11 min-w-11 size-11 rounded-xl hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && <div className="px-5 py-3 border-t bg-[color:var(--bg-card)]">{footer}</div>}
        </div>
      </FocusTrap>
    </div>
  );
}

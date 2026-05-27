'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusTrap } from './FocusTrap';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional aria-label when there is no visible title. */
  ariaLabel?: string;
}

const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md', ariaLabel }: ModalProps) {
  const titleId = React.useId();
  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop — purely decorative; keyboard users dismiss via ESC or the close button. */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <FocusTrap active={open} onEscape={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={!title ? ariaLabel : undefined}
          className={cn(
            'relative w-full glass rounded-2xl shadow-2xl border border-[color:var(--border-strong)]',
            SIZE[size],
            'max-h-[90vh] overflow-y-auto',
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="touch-target min-h-11 min-w-11 p-1 hover:bg-[color:var(--bg-card-hover)] rounded-md inline-flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </FocusTrap>
    </div>
  );
}

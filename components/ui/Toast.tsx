'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Override default duration (ms). Pass 0 to disable auto-dismiss. */
  duration?: number;
}

interface Ctx {
  toast: (t: Omit<ToastItem, 'id'>) => void;
}

const ToastCtx = React.createContext<Ctx>({ toast: () => {} });
export const useToast = () => React.useContext(ToastCtx);

let nextId = 1;

/** Default auto-dismiss — 7s per WCAG 2.2.1 guidance (was 4.5s). */
const DEFAULT_DURATION = 7000;
/** Cap concurrent visible toasts. */
const MAX_TOASTS = 5;

interface ToastNodeProps {
  item: ToastItem;
  onClose: (id: number) => void;
}

function ToastNode({ item, onClose }: ToastNodeProps) {
  const duration = item.duration ?? DEFAULT_DURATION;
  const [paused, setPaused] = React.useState(false);
  const startedAt = React.useRef<number>(Date.now());
  const remaining = React.useRef<number>(duration);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const arm = React.useCallback(() => {
    if (duration <= 0) return; // sticky
    clear();
    startedAt.current = Date.now();
    timerRef.current = setTimeout(() => onClose(item.id), remaining.current);
  }, [duration, item.id, onClose]);

  React.useEffect(() => {
    if (duration <= 0) return;
    arm();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (paused) {
      // pause: subtract elapsed
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
      clear();
    } else if (duration > 0) {
      arm();
    }
  }, [paused, arm, duration]);

  // The variant 'error' uses role=alert (assertive) so it interrupts SR;
  // 'success'/'info' use role=status (polite).
  const role: 'alert' | 'status' = item.variant === 'error' ? 'alert' : 'status';
  const ariaLive: 'assertive' | 'polite' = item.variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto glass rounded-xl px-4 py-3 flex items-start gap-3 shadow-2xl animate-in slide-in-from-right-5 fade-in"
    >
      <span className={cn(
        'mt-0.5 inline-flex',
        item.variant === 'success' && 'text-success',
        item.variant === 'error' && 'text-danger',
        item.variant === 'info' && 'text-gold-300',
      )} aria-hidden="true">
        {item.variant === 'success' ? <CheckCircle2 size={18} /> : item.variant === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
      </span>
      <div className="flex-1">
        <div className="font-medium text-sm">{item.title}</div>
        {item.description && (
          <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">{item.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label="Bildirimi kapat"
        className="touch-target min-h-11 min-w-11 -m-2 p-2 inline-flex items-center justify-center text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] rounded-md"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const close = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = React.useCallback<Ctx['toast']>((t) => {
    const id = nextId++;
    setItems((prev) => {
      const next = [...prev, { ...t, id }];
      // Cap queue length
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {/* Toast viewport — live region wrapper. Each item has its own role for routing. */}
      <div
        aria-label="Bildirimler"
        className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {items.map((t) => (
          <ToastNode key={t.id} item={t} onClose={close} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

'use client';

import * as React from 'react';
import { Heart, Phone, MessageCircle, Calendar, Share2, Check } from 'lucide-react';
import type { Property, Agent } from '@/lib/types';
import { formatPrice, convert } from '@/lib/currency';
import { useCurrency } from '@/lib/currency-store';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/lib/favorites-store';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';

interface Props {
  property: Property;
  agent?: Agent;
  onOpenAppointment: () => void;
  onOpenMessage: () => void;
}

export function MobileActionBar({ property: p, agent, onOpenAppointment, onOpenMessage }: Props) {
  const favorites = useFavorites();
  const { toast } = useToast();
  const { t } = useLang();
  const { currency: displayCurrency } = useCurrency();
  const fav = favorites.has(p.id);
  const [shared, setShared] = React.useState(false);
  const shownPriceLabel = formatPrice(
    Math.round(convert(p.price, p.currency, displayCurrency)),
    displayCurrency,
  );

  async function toggleFav() {
    const r = await favorites.toggle(p.id);
    if (!r.ok) {
      toast({ variant: 'error', title: t('toast.loginRequired.title'), description: t('toast.loginRequired.fav') });
      return;
    }
    toast({ variant: 'success', title: r.favorited ? t('mobileBar.favAdded') : t('mobileBar.favRemoved') });
  }

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ url })) {
        await navigator.share({ title: p.title, url });
        return;
      }
    } catch { /* fall through */ }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast({ variant: 'success', title: t('mobileBar.linkCopied') });
      setTimeout(() => setShared(false), 1800);
    } catch {
      toast({ variant: 'error', title: t('mobileBar.copyFailed') });
    }
  }

  // PP-04: keep the sticky action bar clear of the iOS home-indicator and the
  // global mobile bottom-nav. We offset by 72px (mobile bottom-nav height) PLUS
  // safe-area-inset-bottom, so the "Mesaj gönder" / agent CTAs above the sticky
  // bar are never visually clipped when the page is scrolled to the very bottom.
  return (
    <div
      className="md:hidden fixed inset-x-0 z-40 bg-[color:var(--bg-card)] border-t border-[color:var(--border-strong)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.4)]"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
        paddingBottom: '6px',
      }}
    >
      <div className="px-3 py-2.5 flex items-center gap-1.5">
        {/* Fiyat (kısa) */}
        <div className="min-w-0 flex-1 mr-1">
          <div className="text-[10px] uppercase text-[color:var(--fg-muted)] truncate">
            {p.city} · {p.district}
          </div>
          <div className="text-base font-bold text-gold-300 leading-tight truncate">
            {shownPriceLabel}
          </div>
        </div>

        <button
          onClick={toggleFav}
          // PF-11: standardize aria-label + add aria-pressed + data-testid so
          // the mobile favorite button is testable and SR-friendly.
          aria-label={fav ? t('card.favRemove') : t('card.favAdd')}
          aria-pressed={fav}
          data-testid="favorite-toggle"
          data-favorite-state={fav ? 'on' : 'off'}
          className={cn(
            'touch-target size-10 rounded-xl border flex items-center justify-center active:scale-95 transition-all shrink-0',
            fav ? 'bg-gold-400/15 border-gold-400/50 text-gold-300' : 'border-[color:var(--border-strong)] bg-[color:var(--bg-elev)]',
          )}
        >
          <Heart size={16} className={fav ? 'fill-current' : ''} aria-hidden="true" />
        </button>

        <button
          onClick={share}
          aria-label={t('common.share')}
          className="touch-target size-10 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] flex items-center justify-center active:scale-95 transition-transform shrink-0"
        >
          {shared ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
        </button>

        <button
          onClick={onOpenMessage}
          aria-label={t('mobileBar.sendMessage')}
          className="touch-target size-10 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] flex items-center justify-center active:scale-95 transition-transform shrink-0"
        >
          <MessageCircle size={16} />
        </button>

        {agent && (
          <a
            href={`tel:${agent.phone}`}
            aria-label={t('mobileBar.call')}
            className="touch-target size-10 rounded-xl bg-success/15 border border-success/40 text-success flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <Phone size={16} />
          </a>
        )}

        <button
          onClick={onOpenAppointment}
          className="touch-target h-10 px-3 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 font-semibold inline-flex items-center gap-1 text-xs active:scale-95 transition-transform shadow-[0_4px_12px_-2px_rgba(212,168,67,0.5)] shrink-0"
        >
          <Calendar size={14} /> {t('mobileBar.appointment')}
        </button>
      </div>
    </div>
  );
}

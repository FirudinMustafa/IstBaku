'use client';

import * as React from 'react';
import { Heart, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFavorites } from '@/lib/favorites-store';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { cn } from '@/lib/utils';

interface Props {
  propertyId: string;
  propertyTitle: string;
}

export function PropertyHeaderActions({ propertyId, propertyTitle }: Props) {
  const favorites = useFavorites();
  const { toast } = useToast();
  const { t } = useLang();
  const [shared, setShared] = React.useState(false);
  const fav = favorites.has(propertyId);

  async function toggleFav() {
    const r = await favorites.toggle(propertyId);
    if (!r.ok) {
      toast({ variant: 'error', title: t('toast.loginRequired.title'), description: t('toast.loginRequired.fav') });
      return;
    }
    toast({
      variant: 'success',
      title: r.favorited ? t('mobileBar.favAdded') : t('mobileBar.favRemoved'),
    });
  }

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const data = { title: propertyTitle, text: propertyTitle, url };
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(data)) {
        await navigator.share(data);
        return;
      }
    } catch {
      // ignore — fallback to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast({ variant: 'success', title: t('mobileBar.linkCopied') });
      setTimeout(() => setShared(false), 1800);
    } catch {
      toast({ variant: 'error', title: t('mobileBar.copyFailed') });
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="md"
        className={cn('gap-1.5', fav && 'border-gold-400 text-gold-300')}
        onClick={toggleFav}
        // PF-11: keep selectors consistent between the card heart and the
        // detail-page header heart so persona-7 (and any future a11y audits)
        // can locate either via aria-label / data-testid.
        aria-label={fav ? t('card.favRemove') : t('card.favAdd')}
        aria-pressed={fav}
        data-testid="favorite-toggle"
        data-favorite-state={fav ? 'on' : 'off'}
      >
        <Heart size={15} className={cn(fav && 'fill-gold-400 text-gold-400')} aria-hidden="true" />
        {fav ? t('card.favedShort') : t('card.favShort')}
      </Button>
      <Button variant="outline" size="md" className="gap-1.5" onClick={share}>
        {shared ? <Check size={15} className="text-success" /> : <Share2 size={15} />}
        {shared ? t('common.copied') : t('common.share')}
      </Button>
    </>
  );
}

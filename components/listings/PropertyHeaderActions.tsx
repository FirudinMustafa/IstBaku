'use client';

import * as React from 'react';
import { Heart, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFavorites } from '@/lib/favorites-store';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Props {
  propertyId: string;
  propertyTitle: string;
}

export function PropertyHeaderActions({ propertyId, propertyTitle }: Props) {
  const favorites = useFavorites();
  const { toast } = useToast();
  const [shared, setShared] = React.useState(false);
  const fav = favorites.has(propertyId);

  async function toggleFav() {
    const r = await favorites.toggle(propertyId);
    if (!r.ok) {
      toast({ variant: 'error', title: 'Giriş yapmalısın', description: 'Favoriler için hesap gerekli.' });
      return;
    }
    toast({
      variant: 'success',
      title: r.favorited ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı',
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
      toast({ variant: 'success', title: 'Bağlantı kopyalandı', description: 'Artık paylaşabilirsin.' });
      setTimeout(() => setShared(false), 1800);
    } catch {
      toast({ variant: 'error', title: 'Kopyalanamadı', description: 'Tarayıcı izin vermedi.' });
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
        aria-label={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        aria-pressed={fav}
        data-testid="favorite-toggle"
        data-favorite-state={fav ? 'on' : 'off'}
      >
        <Heart size={15} className={cn(fav && 'fill-gold-400 text-gold-400')} aria-hidden="true" />
        {fav ? 'Favoride' : 'Favori'}
      </Button>
      <Button variant="outline" size="md" className="gap-1.5" onClick={share}>
        {shared ? <Check size={15} className="text-success" /> : <Share2 size={15} />}
        {shared ? 'Kopyalandı' : 'Paylaş'}
      </Button>
    </>
  );
}

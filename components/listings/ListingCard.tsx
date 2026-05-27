'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Heart, MapPin, Maximize2, BedDouble, Bath, Sparkles, ShieldCheck, Video, Eye, Play, GitCompare, Check,
} from 'lucide-react';
import type { Property } from '@/lib/types';
import { formatPrice, convert } from '@/lib/currency';
import { useCurrency } from '@/lib/currency-store';
import { timeAgo, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from './ScoreRing';
import { useCompare, MAX_COMPARE } from '@/lib/compare-store';
import { useFavorites } from '@/lib/favorites-store';
import { useToast } from '@/components/ui/Toast';
import * as React from 'react';

interface Props {
  property: Property;
  compact?: boolean;
}

export function ListingCard({ property: p, compact }: Props) {
  const { toast } = useToast();
  const compare = useCompare();
  const favorites = useFavorites();
  const { currency: displayCurrency } = useCurrency();
  const [hovered, setHovered] = React.useState(false);
  const [imgErrored, setImgErrored] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const fav = favorites.has(p.id);
  const isInCompare = compare.has(p.id);

  // PF-01: render price in the user's chosen display currency, converting via
  // `convert()` on the FX table in lib/currency.ts. We round to whole units
  // because Intl.NumberFormat is given `maximumFractionDigits: 0` already.
  const shownPrice = Math.round(convert(p.price, p.currency, displayCurrency));
  const shownPriceLabel = formatPrice(shownPrice, displayCurrency);

  async function handleFavToggle(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = await favorites.toggle(p.id);
    if (!r.ok) {
      toast({ variant: 'error', title: 'Giriş yapmalısın', description: 'Favoriler için hesap gerekli.' });
    }
  }
  function handleCompareToggle(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = compare.toggle(p.id);
    if (!r.added && r.reason === 'full') {
      toast({ variant: 'error', title: 'Karşılaştırma dolu', description: `En fazla ${MAX_COMPARE} ilan karşılaştırılabilir.` });
    } else if (r.added) {
      toast({ variant: 'success', title: 'Karşılaştırmaya eklendi', description: 'Sağ alt kutudan kıyasla.' });
    }
  }

  // YouTube-tarzı: hover'da video kapağı oynat
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hovered]);

  const coverImg = p.cover.kind === 'photo' ? p.cover.src : p.images[0];

  return (
    // MH-32: The card is now a non-interactive <article>; only the title link is the
    // primary navigation. Heart/compare buttons live as siblings of the link, not nested
    // inside it. This produces valid HTML and lets screen readers announce each control.
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative block rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] overflow-hidden hover:border-gold-400/60 hover:shadow-[0_8px_28px_-10px_rgba(212,168,67,0.35)] transition-all"
    >
      {/* Full-card stretched link — only one focusable target for the body of the card.
          Heart/compare buttons sit above (z-10) with their own click handlers and stop
          propagation, so they remain reachable without nesting inside this anchor. */}
      <Link
        href={`/property/${p.slug}`}
        className="absolute inset-0 z-[1] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[color:var(--ring)] rounded-2xl"
        aria-label={`${p.title} — ${shownPriceLabel} — ${p.city} ${p.district}`}
      />

      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[color:var(--bg-card-hover)] via-[color:var(--bg-elev)] to-[color:var(--bg-card-hover)]">
        {/* Placeholder/skeleton */}
        <div className="absolute inset-0 flex items-center justify-center text-[color:var(--fg-faint)]" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        {/* MC-23: next/image migration. Use fill + sizes for responsive optimization. */}
        {coverImg && !imgErrored && (
          <Image
            src={coverImg}
            // H12: image is decorative — the title heading carries the accessible name.
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgErrored(true)}
            className={cn(
              'object-cover transition-all duration-500',
              p.cover.kind === 'video' && hovered ? 'opacity-0 scale-[1.02]' : 'opacity-100 group-hover:scale-[1.04]',
            )}
          />
        )}

        {/* Video kapak (varsa) — hover'da görünür */}
        {p.cover.kind === 'video' && (
          <video
            ref={videoRef}
            src={p.cover.src}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
              hovered ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
          <div className="flex flex-col gap-1.5">
            {p.tier === 'premium' && <Badge variant="premium"><span aria-hidden="true">★ </span>Premium</Badge>}
            {p.tier === 'guclu' && <Badge variant="ai">Güçlü</Badge>}
            {p.istbakuApproved && (
              <Badge variant="success" className="bg-success/25">
                <ShieldCheck size={11} aria-hidden="true" /> ISTBAKU Onaylı
              </Badge>
            )}
          </div>
          {/* Z-index above the stretched Link so clicks register on these buttons. */}
          <div className="flex flex-col gap-1.5 relative z-10 pointer-events-auto">
            <button
              type="button"
              onClick={handleFavToggle}
              // PF-11: stable selectors for both assistive tech and Playwright.
              // Brief specifies "Favorilere ekle" / "Favorilerden çıkar" copy;
              // aria-pressed exposes toggle state; data-testid pins the button
              // so persona-7's heart-spam scenario can locate it deterministic-
              // ally instead of falling back to a heuristic first-button match.
              aria-label={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              aria-pressed={fav}
              data-testid="favorite-toggle"
              data-favorite-state={fav ? 'on' : 'off'}
              className="touch-target min-h-11 min-w-11 size-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
            >
              <Heart size={18} className={cn('text-white', fav && 'fill-gold-400 text-gold-400')} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleCompareToggle}
              aria-label={isInCompare ? 'Karşılaştırmadan çıkar' : 'Karşılaştırmaya ekle'}
              aria-pressed={isInCompare}
              className={cn(
                'touch-target min-h-11 min-w-11 size-11 rounded-full backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400',
                isInCompare
                  ? 'bg-gold-400 text-navy-900 ring-2 ring-gold-400/40'
                  : 'bg-black/40 text-white hover:bg-black/60',
              )}
            >
              {isInCompare ? <Check size={18} aria-hidden="true" /> : <GitCompare size={17} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          <div className="text-white">
            <div className="text-[11px] uppercase tracking-wider opacity-80 flex items-center gap-1">
              <MapPin size={11} aria-hidden="true" /> {p.city} · {p.district}
            </div>
            <div className="text-lg font-bold leading-tight">{shownPriceLabel}</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white opacity-90">
            {p.cover.kind === 'video' && (
              <span className="inline-flex items-center gap-0.5 rounded bg-black/50 px-1.5 py-0.5 backdrop-blur">
                <Play size={11} aria-hidden="true" /> Video
              </span>
            )}
            {p.video && p.cover.kind !== 'video' && <Video size={12} aria-hidden="true" />}
            {p.has360 && <span className="rounded bg-white/15 px-1.5 py-0.5 backdrop-blur">360°</span>}
          </div>
        </div>
      </div>

      <div className="p-4 relative">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 group-hover:text-gold-300 transition-colors">
            {p.title}
          </h3>
          <ScoreRing value={p.score.total} size={48} stroke={4} outOf={10} />
        </div>

        {!compact && (
          <div className="mt-3 flex items-center gap-3 text-xs text-[color:var(--fg-muted)]">
            <span className="inline-flex items-center gap-1"><BedDouble size={13} aria-hidden="true" /> {p.rooms}</span>
            <span className="inline-flex items-center gap-1"><Bath size={13} aria-hidden="true" /> {p.bathrooms}</span>
            <span className="inline-flex items-center gap-1"><Maximize2 size={13} aria-hidden="true" /> {p.area.net} m²</span>
            <span className="inline-flex items-center gap-1 ml-auto"><Eye size={13} aria-hidden="true" /> {p.views.toLocaleString('tr-TR')}</span>
          </div>
        )}

        {!compact && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-[color:var(--fg-faint)] pt-3 border-t">
            <span className="inline-flex items-center gap-1">
              <Sparkles size={11} aria-hidden="true" className="text-gold-300" /> AI ile gözden geçirildi
            </span>
            <span>{timeAgo(p.publishedAt)}</span>
          </div>
        )}
      </div>
    </article>
  );
}

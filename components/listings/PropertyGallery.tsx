'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2, Play, X, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { FocusTrap } from '@/components/ui/FocusTrap';

export function PropertyGallery({ images, has360, video }: { images: string[]; has360?: boolean; video?: string }) {
  const [idx, setIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<'photos' | 'video' | '360'>('photos');

  const safeImages = images.length > 0 ? images : ['https://picsum.photos/seed/empty/1600/1000'];
  const main = safeImages[0];
  const thumbs = safeImages.slice(1, 5);
  const remaining = Math.max(0, safeImages.length - 5);

  const go = React.useCallback((d: number) => {
    setIdx((i) => (i + d + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  // Klavye: ESC kapat, ←→ gez
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (tab !== 'photos') return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, tab, go]);

  // Touch swipe for lightbox
  const touchStartX = React.useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx > 0 ? -1 : 1);
    touchStartX.current = null;
  }

  // Inline mobile carousel state
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [carouselIdx, setCarouselIdx] = React.useState(0);

  function scrollCarouselTo(i: number) {
    const el = carouselRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  }

  React.useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setCarouselIdx(Math.max(0, Math.min(safeImages.length - 1, i)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [safeImages.length]);

  return (
    <>
      {/* MOBİL: tek-foto carousel + dots */}
      <div className="md:hidden -mx-4 sm:mx-0">
        <div
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none aspect-[4/3]"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {safeImages.map((src, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setOpen(true); setTab('photos'); }}
              className="shrink-0 w-full snap-start bg-[color:var(--bg-card-hover)] relative"
              aria-label={`Foto ${i + 1}`}
            >
              {/* MC-23: next/image for responsive optimization */}
              <Image
                src={src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority={i === 0}
              />
              {i === 0 && (
                <div className="absolute top-3 left-3 flex gap-2">
                  {has360 && <Badge variant="ai">360°</Badge>}
                  {video && <Badge variant="gold"><Play size={11} /> Video</Badge>}
                </div>
              )}
              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 text-white text-xs px-2.5 py-1 backdrop-blur">
                {i + 1} / {safeImages.length}
              </div>
            </button>
          ))}
        </div>
        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {safeImages.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollCarouselTo(i)}
              aria-label={`Foto ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                carouselIdx === i ? 'w-6 bg-gold-400' : 'w-1.5 bg-[color:var(--border-strong)]',
              )}
            />
          ))}
          {safeImages.length > 8 && (
            <span className="text-[10px] text-[color:var(--fg-muted)] ml-1">+{safeImages.length - 8}</span>
          )}
        </div>
      </div>

      {/* DESKTOP: 4-grid */}
      <div className="hidden md:grid relative grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-2xl overflow-hidden">
        <button
          onClick={() => { setIdx(0); setOpen(true); setTab('photos'); }}
          className="col-span-2 row-span-2 relative group bg-[color:var(--bg-card-hover)]"
          aria-label="Galeriyi aç"
        >
          <Image
            src={main}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-cover group-hover:scale-[1.02] transition-transform"
          />
          <div className="absolute bottom-3 left-3 flex gap-2">
            {has360 && <Badge variant="ai">360° Tur</Badge>}
            {video && <Badge variant="gold"><Play size={11} /> Video</Badge>}
          </div>
        </button>

        {Array.from({ length: 4 }).map((_, i) => {
          const src = thumbs[i];
          const isLast = i === 3 && remaining > 0;
          if (!src) {
            return (
              <div key={i} className="relative bg-[color:var(--bg-card-hover)] flex items-center justify-center text-[color:var(--fg-faint)]">
                <ImageIcon size={20} />
              </div>
            );
          }
          return (
            <button
              key={i}
              onClick={() => { setIdx(i + 1); setOpen(true); setTab('photos'); }}
              className="relative bg-[color:var(--bg-card-hover)] group"
              aria-label={`Foto ${i + 2}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-[1.04] transition-transform"
              />
              {isLast && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                  +{remaining} foto
                </div>
              )}
            </button>
          );
        })}

        <button
          onClick={() => setOpen(true)}
          className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur px-3 py-1.5 text-white text-xs hover:bg-black/85"
        >
          <Maximize2 size={13} /> Tümünü gör ({safeImages.length})
        </button>
      </div>

      {/* Lightbox */}
      {open && (
        <FocusTrap active={open} onEscape={() => setOpen(false)}>
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Galeri">
          <div className="flex items-center justify-between p-3 sm:p-4 safe-top">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <button onClick={() => setTab('photos')} className={cn('rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm', tab === 'photos' ? 'bg-gold-400 text-navy-900' : 'text-white border border-white/20')}>
                Foto ({safeImages.length})
              </button>
              {video && (
                <button onClick={() => setTab('video')} className={cn('rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm', tab === 'video' ? 'bg-gold-400 text-navy-900' : 'text-white border border-white/20')}>
                  Video
                </button>
              )}
              {has360 && (
                <button onClick={() => setTab('360')} className={cn('rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm', tab === '360' ? 'bg-gold-400 text-navy-900' : 'text-white border border-white/20')}>
                  360°
                </button>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="touch-target size-10 rounded-xl text-white hover:bg-white/10 flex items-center justify-center" aria-label="Kapat (ESC)">
              <X size={22} />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 relative"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {tab === 'photos' && (
              <>
                {safeImages.length > 1 && (
                  <button onClick={() => go(-1)} aria-label="Önceki" className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 items-center justify-center"><ChevronLeft /></button>
                )}
                <img src={safeImages[idx]} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
                {safeImages.length > 1 && (
                  <button onClick={() => go(1)} aria-label="Sonraki" className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 items-center justify-center"><ChevronRight /></button>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 rounded-full px-3 py-1 safe-bottom">
                  {idx + 1} / {safeImages.length}
                </div>
              </>
            )}
            {tab === 'video' && video && (
              <video src={video} controls autoPlay className="max-h-full max-w-full rounded-lg" />
            )}
            {tab === '360' && (
              <div className="text-center text-white">
                <div className="text-6xl mb-3" aria-hidden="true">🌐</div>
                <p className="text-lg">360° Sanal Tur</p>
                <p className="text-sm opacity-60 mt-1">Mülk içinde interaktif gezinti — Matterport altyapısı</p>
              </div>
            )}
          </div>
        </div>
        </FocusTrap>
      )}
    </>
  );
}

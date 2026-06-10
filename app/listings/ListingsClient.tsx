'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Map as MapIcon, List, Sparkles, Columns, SlidersHorizontal, X, ShieldCheck } from 'lucide-react';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FilterSidebar } from '@/components/listings/FilterSidebar';
import dynamic from 'next/dynamic';
import { ListingCard } from '@/components/listings/ListingCard';
import { useLang } from '@/components/layout/LangProvider';

// Perf (Madde 14): Leaflet ağır + sadece tarayıcıda çalışır → harita yalnızca
// gerektiğinde (split/map görünümü) yüklensin, başlangıç bundle'ından çıksın.
const MapView = dynamic(() => import('@/components/listings/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[color:var(--bg-elev)] animate-pulse" />,
});
import type { FilterState, Property } from '@/lib/types';
import type { MapBounds } from '@/components/listings/MapView';
import { cn } from '@/lib/utils';
import { formatListingNumber, parseListingNumber } from '@/lib/listing-number';

function applyFilters(list: Property[], f: FilterState, q?: string): Property[] {
  let out = list.filter((p) => !p.isPrivate);
  if (q) {
    const ql = q.toLowerCase();
    // İlan numarasıyla arama: "12", "00012" veya "#00012" hepsi çalışır.
    const qNum = parseListingNumber(q);
    const qDigits = q.trim().replace(/^#/, '');
    out = out.filter((p) =>
      (qNum != null && p.listingNumber === qNum) ||
      (/^\d+$/.test(qDigits) && formatListingNumber(p.listingNumber).includes(qDigits)) ||
      [p.title, p.description, p.city, p.district, p.neighborhood ?? ''].some((s) => s.toLowerCase().includes(ql)),
    );
  }
  if (f.purpose) out = out.filter((p) => p.purpose === f.purpose);
  if (f.country) out = out.filter((p) => p.country === f.country);
  if (f.city) out = out.filter((p) => p.city === f.city);
  if (f.district) out = out.filter((p) => p.district === f.district);
  if (f.neighborhood?.trim()) {
    const nl = f.neighborhood.trim().toLowerCase();
    out = out.filter((p) => (p.neighborhood ?? '').toLowerCase().includes(nl));
  }
  if (f.siteName?.trim()) {
    const sl = f.siteName.trim().toLowerCase();
    out = out.filter((p) => (p.siteName ?? '').toLowerCase().includes(sl));
  }
  if (f.type?.length) out = out.filter((p) => f.type!.includes(p.type));
  if (f.minPrice) out = out.filter((p) => p.price >= f.minPrice!);
  if (f.maxPrice) out = out.filter((p) => p.price <= f.maxPrice!);
  if (f.rooms?.length) out = out.filter((p) => f.rooms!.includes(p.rooms));
  if (f.minArea) out = out.filter((p) => p.area.net >= f.minArea!);
  if (f.maxArea) out = out.filter((p) => p.area.net <= f.maxArea!);
  if (f.minGrossArea) out = out.filter((p) => p.area.gross >= f.minGrossArea!);
  if (f.maxGrossArea) out = out.filter((p) => p.area.gross <= f.maxGrossArea!);
  if (f.buildingMinAge != null) out = out.filter((p) => p.buildingAge >= f.buildingMinAge!);
  if (f.buildingMaxAge != null) out = out.filter((p) => p.buildingAge <= f.buildingMaxAge!);
  if (f.minFloor != null) out = out.filter((p) => p.floor >= f.minFloor!);
  if (f.maxFloor != null) out = out.filter((p) => p.floor <= f.maxFloor!);
  if (f.bathrooms != null) out = out.filter((p) => p.bathrooms >= f.bathrooms!);
  if (f.heating?.length) {
    out = out.filter((p) => {
      const h = p.heating.toLowerCase();
      return f.heating!.some((v) =>
        v === 'kombi' ? h.includes('kombi')
        : v === 'merkezi' ? h.includes('merkezi')
        : v === 'yerden' ? h.includes('yerden')
        : v === 'yok' ? h === 'yok' || h === ''
        : false,
      );
    });
  }
  if (f.housingType?.length) out = out.filter((p) => f.housingType!.includes(p.housingType ?? 'belirtilmemis'));
  if (f.energyClass?.length) out = out.filter((p) => f.energyClass!.includes(p.energyClass ?? 'belirsiz'));
  if (f.buildingStatus?.length) out = out.filter((p) => f.buildingStatus!.includes(p.buildingStatus ?? 'belirtilmemis'));
  if (f.structureType?.length) out = out.filter((p) => f.structureType!.includes(p.structureType ?? 'belirtilmemis'));
  if (f.facade?.length) out = out.filter((p) => f.facade!.includes(p.facade ?? 'belirtilmemis'));
  if (f.ownerType?.length) out = out.filter((p) => f.ownerType!.includes(p.ownerType));
  if (f.titleDeed?.length) out = out.filter((p) => f.titleDeed!.includes(p.titleDeed));
  if (f.status?.length) out = out.filter((p) => f.status!.includes(p.status));
  if (f.swappable) out = out.filter((p) => p.swappable);
  if (f.features?.length) {
    out = out.filter((p) => f.features!.every((feat) => {
      if (feat === 'parking') return p.parking !== 'yok';
      return (p as unknown as Record<string, boolean>)[feat] === true;
    }));
  }
  if (f.istbakuApproved) out = out.filter((p) => p.istbakuApproved);
  if (f.withVideo) out = out.filter((p) => !!p.video || p.cover.kind === 'video');
  if (f.with360) out = out.filter((p) => p.has360);
  if (f.publishedWithin) {
    const map: Record<string, number> = { today: 1, '3d': 3, '7d': 7, '30d': 30, '90d': 90 };
    const days = map[f.publishedWithin] ?? 0;
    if (days) {
      const cutoff = Date.now() - days * 86400000;
      out = out.filter((p) => new Date(p.publishedAt).getTime() >= cutoff);
    }
  }
  switch (f.sort) {
    case 'price_asc': out = [...out].sort((a, b) => a.price - b.price); break;
    case 'price_desc': out = [...out].sort((a, b) => b.price - a.price); break;
    case 'score_desc': out = [...out].sort((a, b) => b.score.total - a.score.total); break;
    case 'newest':
    default: out = [...out].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }
  return out;
}

// Filter state'inde kaç aktif filtre var?
function activeFilterCount(f: FilterState, q?: string): number {
  let n = 0;
  if (q?.trim()) n++;
  if (f.purpose) n++;
  if (f.country) n++;
  if (f.neighborhood?.trim()) n++;
  if (f.siteName?.trim()) n++;
  if (f.type?.length) n += f.type.length;
  if (f.minPrice || f.maxPrice) n++;
  if (f.rooms?.length) n += f.rooms.length;
  if (f.bathrooms) n++;
  if (f.minArea || f.maxArea) n++;
  if (f.minGrossArea || f.maxGrossArea) n++;
  if (f.buildingMinAge != null || f.buildingMaxAge != null) n++;
  if (f.minFloor != null || f.maxFloor != null) n++;
  if (f.heating?.length) n += f.heating.length;
  if (f.features?.length) n += f.features.length;
  if (f.housingType?.length) n += f.housingType.length;
  if (f.energyClass?.length) n += f.energyClass.length;
  if (f.buildingStatus?.length) n += f.buildingStatus.length;
  if (f.structureType?.length) n += f.structureType.length;
  if (f.facade?.length) n += f.facade.length;
  if (f.ownerType?.length) n += f.ownerType.length;
  if (f.titleDeed?.length) n += f.titleDeed.length;
  if (f.status?.length) n += f.status.length;
  if (f.istbakuApproved) n++;
  if (f.withVideo) n++;
  if (f.with360) n++;
  if (f.swappable) n++;
  if (f.publishedWithin) n++;
  return n;
}

interface ListingsClientProps {
  initialListings?: Property[];
  countries?: { code: string; label: string; flag: string }[];
}

export function ListingsClient({ initialListings = [], countries = [] }: ListingsClientProps) {
  const { t } = useLang();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialQ = sp.get('q') ?? sp.get('city') ?? '';
  const initialCountry = sp.get('country');
  const [q, setQ] = React.useState(initialQ);
  const [filters, setFilters] = React.useState<FilterState>({
    sort: 'newest',
    country: initialCountry === 'TR' || initialCountry === 'AZ' ? initialCountry : undefined,
    istbakuApproved: sp.get('approved') === '1' || undefined,
  });
  const [view, setView] = React.useState<'list' | 'map' | 'split'>('split');
  const [active, setActive] = React.useState<string | undefined>();
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  // Tur6 #3: harita görünür alanı → sol liste o bölgeyi göstersin (Airbnb tarzı)
  const [mapBounds, setMapBounds] = React.useState<MapBounds | null>(null);
  const [searchInArea, setSearchInArea] = React.useState(true);
  // MH-28: hide mobile filter sticky bar on scroll-down so it doesn't stack with the header.
  const [showMobileBar, setShowMobileBar] = React.useState(true);
  const lastScrollY = React.useRef(0);
  React.useEffect(() => {
    // Perf (Madde 14): scroll olayını rAF ile throttle et — hızlı kaydırmada
    // her frame'de setState çağrısını önler (mobilde kasma azalır).
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const dy = y - lastScrollY.current;
        if (Math.abs(dy) < 4) return;
        if (y < 80) setShowMobileBar(true);
        else if (dy > 0) setShowMobileBar(false); // aşağı — gizle
        else setShowMobileBar(true);              // yukarı — göster
        lastScrollY.current = y;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const results = React.useMemo(() => applyFilters(initialListings, filters, q), [filters, q, initialListings]);
  const filterCount = activeFilterCount(filters, q);

  // Filtre/arama değişince harita yeni sonuçlara fit olur → eski bounds'u temizle (tüm sonuçlar görünsün).
  React.useEffect(() => { setMapBounds(null); }, [filters, q]);

  // Harita görünür alanına göre liste (Airbnb): bounds yoksa veya kapalıysa tüm sonuçlar.
  const visibleResults = React.useMemo(() => {
    if (!searchInArea || !mapBounds) return results;
    return results.filter((p) =>
      p.coords && p.coords.lat <= mapBounds.n && p.coords.lat >= mapBounds.s
      && p.coords.lng <= mapBounds.e && p.coords.lng >= mapBounds.w,
    );
  }, [results, searchInArea, mapBounds]);

  // Madde 3: "site içi" araması için o bölgedeki mevcut site/kompleks isimleri —
  // yüklü ilanlardan (seçili şehir/ilçeye göre) distinct türetilir; yeni ilan eklendikçe büyür.
  const siteSuggestions = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of initialListings) {
      if (!p.siteName) continue;
      if (filters.city && p.city !== filters.city) continue;
      if (filters.district && p.district !== filters.district) continue;
      set.add(p.siteName.trim());
    }
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [initialListings, filters.city, filters.district]);

  // URL'yi search query ile senkronize tut (debounced).
  // PP-01: under rapid filter spam, calling router.replace inside an old timer can
  // race with React commits and produce console warnings. We track mount state and
  // bail out if the timer fires after unmount/re-render.
  React.useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (filters.country) params.set('country', filters.country);
      if (filters.istbakuApproved) params.set('approved', '1');
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, filters.country, filters.istbakuApproved, pathname, router]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Üst başlık */}
      <div className="flex items-end justify-between flex-wrap gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">{t('listings.heading')}</h1>
          <p className="text-xs md:text-sm text-[color:var(--fg-muted)] mt-0.5 md:mt-1">
            {results.length.toLocaleString('tr-TR')} {t('listings.results')}{filterCount > 0 ? ` · ${filterCount} ${t('listings.activeFilter')}` : ''}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('listings.searchPlaceholder')}
              aria-label={t('listings.searchPlaceholder')}
              maxLength={200}
              className="h-10 w-72 max-w-full pl-9 pr-3 rounded-xl bg-[color:var(--bg-elev)] border focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
            <Sparkles size={14} className="absolute left-3 top-3 text-gold-300" />
          </div>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, istbakuApproved: !filters.istbakuApproved })}
            aria-pressed={!!filters.istbakuApproved}
            title={t('listings.approvedOnly')}
            className={cn(
              'h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border text-sm font-medium transition-colors',
              filters.istbakuApproved
                ? 'bg-gold-400/15 border-gold-400/60 text-gold-300'
                : 'bg-[color:var(--bg-elev)] text-[color:var(--fg-muted)] hover:border-gold-400/40',
            )}
          >
            <ShieldCheck size={15} /> {t('home.premium.badge')}
          </button>
          <Select value={filters.sort ?? 'newest'} onChange={(e) => setFilters({ ...filters, sort: e.target.value as FilterState['sort'] })} className="w-44">
            <option value="newest">{t('listings.sortNewest')}</option>
            <option value="price_asc">{t('listings.sortPriceAsc')}</option>
            <option value="price_desc">{t('listings.sortPriceDesc')}</option>
            <option value="score_desc">{t('listings.sortScoreDesc')}</option>
          </Select>
          <div className="hidden md:flex items-center rounded-xl border bg-[color:var(--bg-elev)] p-1">
            {[
              { k: 'list', i: List, l: t('listings.viewList') },
              { k: 'split', i: Columns, l: t('listings.viewSplit') },
              { k: 'map', i: MapIcon, l: t('listings.viewMap') },
            ].map((v) => (
              <button
                key={v.k}
                onClick={() => setView(v.k as typeof view)}
                className={`h-8 px-2 inline-flex items-center gap-1 rounded-lg text-xs ${
                  view === v.k ? 'bg-gold-400/15 text-gold-300' : 'text-[color:var(--fg-muted)]'
                }`}
              >
                <v.i size={13} /> {v.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MOBİL: arama bar */}
      <div className="md:hidden mt-3">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('filter.searchPh')}
            aria-label={t('filter.searchAria')}
            maxLength={200}
            className="h-11 w-full pl-10 pr-9 rounded-xl bg-[color:var(--bg-elev)] border focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
          />
          <Sparkles size={15} className="absolute left-3 top-3 text-gold-300" />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label={t('listings.clearSearch')}
              className="absolute right-2 top-2 size-7 rounded-lg flex items-center justify-center text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-card-hover)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* MOBİL: filtre + sıralama + view toolbar — MH-28: scrolls with page, only re-pins
          near the top so two sticky bars (Header + this) never stack on small viewports. */}
      <div
        className={cn(
          'md:hidden -mx-4 px-4 py-2 mt-2 bg-[color:var(--bg)]/95 backdrop-blur border-b border-[color:var(--border)] flex items-center gap-2 overflow-x-auto transition-transform',
          showMobileBar ? 'sticky top-16 z-30 translate-y-0' : 'sticky top-16 z-30 -translate-y-full pointer-events-none',
        )}
      >
        <button
          onClick={() => setFilterSheetOpen(true)}
          className={cn(
            'relative shrink-0 h-9 px-3 rounded-full border inline-flex items-center gap-1.5 text-sm font-medium active:scale-95 transition-transform',
            filterCount > 0
              ? 'bg-gold-400/15 border-gold-400 text-gold-300'
              : 'border-[color:var(--border-strong)] bg-[color:var(--bg-elev)]',
          )}
        >
          <SlidersHorizontal size={14} /> {t('listings.filter')}
          {filterCount > 0 && (
            <span className="size-5 rounded-full bg-gold-400 text-navy-900 text-[10px] font-bold flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>

        <Select
          value={filters.sort ?? 'newest'}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value as FilterState['sort'] })}
          className="!h-9 !w-auto shrink-0 !pr-8"
        >
          <option value="newest">{t('listings.sortNewest')}</option>
          <option value="price_asc">{t('listings.sortPriceUp')}</option>
          <option value="price_desc">{t('listings.sortPriceDown')}</option>
          <option value="score_desc">{t('listings.sortScore')}</option>
        </Select>

        {/* Hızlı İstBaku Onaylı toggle */}
        <button
          onClick={() => setFilters({ ...filters, istbakuApproved: filters.istbakuApproved ? undefined : true })}
          aria-pressed={!!filters.istbakuApproved}
          className={cn(
            'shrink-0 h-9 px-3 rounded-full border inline-flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-transform',
            filters.istbakuApproved
              ? 'bg-gold-400/15 border-gold-400 text-gold-300'
              : 'border-[color:var(--border-strong)] bg-[color:var(--bg-elev)]',
          )}
        >
          <ShieldCheck size={13} /> {t('listings.approvedShort')}
        </button>

        {/* Hızlı chip'ler */}
        {filters.country && (
          <button
            onClick={() => setFilters({ ...filters, country: undefined })}
            className="shrink-0 h-9 px-3 rounded-full bg-gold-400/15 border border-gold-400/40 text-gold-300 text-xs inline-flex items-center gap-1"
          >
            {filters.country === 'TR' ? '🇹🇷 Türkiye' : '🇦🇿 Azerbaycan'} <X size={11} />
          </button>
        )}
        <button
          onClick={() => setView(view === 'map' ? 'list' : 'map')}
          className="shrink-0 h-9 px-3 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] text-xs inline-flex items-center gap-1.5"
        >
          {view === 'map' ? <List size={13} /> : <MapIcon size={13} />}
          {view === 'map' ? t('listings.viewList') : t('listings.viewMap')}
        </button>
      </div>

      <div className="mt-4 md:mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onChange={setFilters} resultCount={results.length} countries={countries} siteSuggestions={siteSuggestions} />
        </div>

        <div id="listings-results">
          {/* MOBİL: harita modu */}
          {view === 'map' && (
            <div className="md:hidden h-[calc(100vh-13rem)] rounded-2xl overflow-hidden border">
              <MapView properties={results} activeId={active} onSelect={setActive} />
            </div>
          )}

          {/* Desktop: split view (Airbnb: harita oynadıkça liste o bölgeyi gösterir) */}
          {view === 'split' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div>
                <div className="hidden xl:flex items-center justify-between mb-3 text-xs">
                  <span className="text-[color:var(--fg-muted)]">
                    {visibleResults.length} {t('listings.count')}{searchInArea && mapBounds ? ` · ${t('map.inThisArea')}` : ''}
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={searchInArea} onChange={(e) => setSearchInArea(e.target.checked)} className="accent-gold-400" />
                    <span>{t('map.searchInArea')}</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleResults.map((p) => (
                    <div key={p.id} onMouseEnter={() => setActive(p.id)}>
                      <ListingCard property={p} compact />
                    </div>
                  ))}
                  {visibleResults.length === 0 && <EmptyState />}
                </div>
              </div>
              <div className="hidden xl:block sticky top-20 h-[calc(100vh-6rem)] rounded-2xl overflow-hidden border">
                <MapView properties={results} activeId={active} onSelect={setActive} onBoundsChange={setMapBounds} />
              </div>
            </div>
          )}
          {view === 'list' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {results.map((p) => <ListingCard key={p.id} property={p} />)}
              {results.length === 0 && <EmptyState />}
            </div>
          )}
          {view === 'map' && (
            <div className="hidden md:block h-[calc(100vh-12rem)] rounded-2xl overflow-hidden border">
              <MapView properties={results} activeId={active} onSelect={setActive} />
            </div>
          )}
        </div>
      </div>

      {/* MOBİL filtre bottom sheet */}
      <BottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title={t('listings.filtersTitle')}
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setFilters({ sort: filters.sort })}
            >
              {t('listings.reset')}
            </Button>
            <Button
              variant="gold"
              size="lg"
              className="flex-[2]"
              onClick={() => setFilterSheetOpen(false)}
            >
              {results.length.toLocaleString('tr-TR')} {t('listings.showListings')}
            </Button>
          </div>
        }
      >
        <FilterSidebar filters={filters} onChange={setFilters} resultCount={results.length} countries={countries} siteSuggestions={siteSuggestions} />
      </BottomSheet>
    </div>
  );
}

function EmptyState() {
  const { t } = useLang();
  return (
    <div className="col-span-full rounded-2xl border bg-[color:var(--bg-card)] p-10 text-center">
      <Badge variant="outline">{t('listings.noResults')}</Badge>
      <p className="mt-3 text-[color:var(--fg-muted)]">{t('listings.noResultsHint')}</p>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Map as MapIcon, List, Sparkles, Columns, SlidersHorizontal, X } from 'lucide-react';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FilterSidebar } from '@/components/listings/FilterSidebar';
import { ListingCard } from '@/components/listings/ListingCard';
import { MapView } from '@/components/listings/MapView';
import type { FilterState, Property } from '@/lib/types';
import { cn } from '@/lib/utils';

function applyFilters(list: Property[], f: FilterState, q?: string): Property[] {
  let out = list.filter((p) => !p.isPrivate);
  if (q) {
    const ql = q.toLowerCase();
    out = out.filter((p) =>
      [p.title, p.description, p.city, p.district, p.neighborhood ?? ''].some((s) => s.toLowerCase().includes(ql)),
    );
  }
  if (f.purpose) out = out.filter((p) => p.purpose === f.purpose);
  if (f.country) out = out.filter((p) => p.country === f.country);
  if (f.city) out = out.filter((p) => p.city === f.city);
  if (f.district) out = out.filter((p) => p.district === f.district);
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
  if (f.ownerType?.length) out = out.filter((p) => f.ownerType!.includes(p.ownerType));
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
  if (f.ownerType?.length) n += f.ownerType.length;
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
  // MH-28: hide mobile filter sticky bar on scroll-down so it doesn't stack with the header.
  const [showMobileBar, setShowMobileBar] = React.useState(true);
  const lastScrollY = React.useRef(0);
  React.useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const dy = y - lastScrollY.current;
      // Only react to meaningful scroll deltas, ignore tiny rubber-band jitter.
      if (Math.abs(dy) < 4) return;
      if (y < 80) setShowMobileBar(true);
      else if (dy > 0) setShowMobileBar(false); // scrolling down — hide
      else setShowMobileBar(true);              // scrolling up — show
      lastScrollY.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const results = React.useMemo(() => applyFilters(initialListings, filters, q), [filters, q, initialListings]);
  const filterCount = activeFilterCount(filters, q);

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
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Tüm İlanlar</h1>
          <p className="text-xs md:text-sm text-[color:var(--fg-muted)] mt-0.5 md:mt-1">
            {results.length.toLocaleString('tr-TR')} sonuç{filterCount > 0 ? ` · ${filterCount} aktif filtre` : ''}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Doğal dilde ara…"
              aria-label="İlanlarda doğal dilde ara"
              maxLength={200}
              className="h-10 w-72 max-w-full pl-9 pr-3 rounded-xl bg-[color:var(--bg-elev)] border focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
            <Sparkles size={14} className="absolute left-3 top-3 text-gold-300" />
          </div>
          <Select value={filters.sort ?? 'newest'} onChange={(e) => setFilters({ ...filters, sort: e.target.value as FilterState['sort'] })} className="w-44">
            <option value="newest">En yeni</option>
            <option value="price_asc">Fiyat: Artan</option>
            <option value="price_desc">Fiyat: Azalan</option>
            <option value="score_desc">AI Skor: Yüksek</option>
          </Select>
          <div className="hidden md:flex items-center rounded-xl border bg-[color:var(--bg-elev)] p-1">
            {[
              { k: 'list', i: List, l: 'Liste' },
              { k: 'split', i: Columns, l: 'Bölünmüş' },
              { k: 'map', i: MapIcon, l: 'Harita' },
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
            placeholder="Bakı Səbail, Beşiktaş 3+1…"
            aria-label="İlanlarda ara"
            maxLength={200}
            className="h-11 w-full pl-10 pr-9 rounded-xl bg-[color:var(--bg-elev)] border focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
          />
          <Sparkles size={15} className="absolute left-3 top-3 text-gold-300" />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Aramayı temizle"
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
          <SlidersHorizontal size={14} /> Filtrele
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
          <option value="newest">En yeni</option>
          <option value="price_asc">Fiyat ↑</option>
          <option value="price_desc">Fiyat ↓</option>
          <option value="score_desc">AI Skor</option>
        </Select>

        {/* Hızlı chip'ler */}
        {filters.country && (
          <button
            onClick={() => setFilters({ ...filters, country: undefined })}
            className="shrink-0 h-9 px-3 rounded-full bg-gold-400/15 border border-gold-400/40 text-gold-300 text-xs inline-flex items-center gap-1"
          >
            {filters.country === 'TR' ? '🇹🇷 Türkiye' : '🇦🇿 Azərbaycan'} <X size={11} />
          </button>
        )}
        {filters.istbakuApproved && (
          <button
            onClick={() => setFilters({ ...filters, istbakuApproved: undefined })}
            className="shrink-0 h-9 px-3 rounded-full bg-gold-400/15 border border-gold-400/40 text-gold-300 text-xs inline-flex items-center gap-1"
          >
            Onaylı <X size={11} />
          </button>
        )}
        <button
          onClick={() => setView(view === 'map' ? 'list' : 'map')}
          className="shrink-0 h-9 px-3 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] text-xs inline-flex items-center gap-1.5"
        >
          {view === 'map' ? <List size={13} /> : <MapIcon size={13} />}
          {view === 'map' ? 'Liste' : 'Harita'}
        </button>
      </div>

      <div className="mt-4 md:mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onChange={setFilters} resultCount={results.length} countries={countries} />
        </div>

        <div id="listings-results">
          {/* MOBİL: harita modu */}
          {view === 'map' && (
            <div className="md:hidden h-[calc(100vh-13rem)] rounded-2xl overflow-hidden border">
              <MapView properties={results} activeId={active} onSelect={setActive} />
            </div>
          )}

          {/* Desktop: split view */}
          {view === 'split' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((p) => (
                  <div key={p.id} onMouseEnter={() => setActive(p.id)}>
                    <ListingCard property={p} compact />
                  </div>
                ))}
                {results.length === 0 && <EmptyState />}
              </div>
              <div className="hidden xl:block sticky top-20 h-[calc(100vh-6rem)] rounded-2xl overflow-hidden border">
                <MapView properties={results} activeId={active} onSelect={setActive} />
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
        title="Filtreler"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setFilters({ sort: filters.sort })}
            >
              Sıfırla
            </Button>
            <Button
              variant="gold"
              size="lg"
              className="flex-[2]"
              onClick={() => setFilterSheetOpen(false)}
            >
              {results.length.toLocaleString('tr-TR')} ilanı göster
            </Button>
          </div>
        }
      >
        <FilterSidebar filters={filters} onChange={setFilters} resultCount={results.length} countries={countries} />
      </BottomSheet>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full rounded-2xl border bg-[color:var(--bg-card)] p-10 text-center">
      <Badge variant="outline">Sonuç yok</Badge>
      <p className="mt-3 text-[color:var(--fg-muted)]">Filtrelerini gevşet ya da farklı bir bölge dene.</p>
    </div>
  );
}

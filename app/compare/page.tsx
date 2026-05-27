'use client';

import * as React from 'react';
import Link from 'next/link';
import { X, GitCompare, ArrowLeft, Sparkles, Plus, ChevronDown } from 'lucide-react';
import { useCompare, MAX_COMPARE } from '@/lib/compare-store';
import type { Property } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from '@/components/listings/ScoreRing';
import { formatPrice, CURRENCY_SYMBOLS, convert } from '@/lib/currency';
import { useCurrency } from '@/lib/currency-store';
import { formatNumber, cn } from '@/lib/utils';
import type { Currency } from '@/lib/types';
import {
  PROPERTY_TYPE_LABEL, PURPOSE_LABEL, OWNER_TYPE_LABEL, TITLE_DEED_LABEL,
  STATUS_LABEL, PARKING_LABEL, formatFloor,
} from '@/lib/labels';

// PP-02: tiny inline SVG used when a listing's cover URL is missing/broken so
// /compare never logs the noisy "GET <empty> 404" or onError chain in the console.
const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#1a2535"/></svg>',
  );

export default function ComparePage() {
  const compare = useCompare();
  const { currency: displayCurrency } = useCurrency();
  const [properties, setProperties] = React.useState<Property[]>([]);
  // SSR'da loading=false → compare.ids boş ise direkt empty state render edilir
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (compare.ids.length === 0) {
      setProperties([]);
      return;
    }
    setLoading(true);
    Promise.all(
      compare.ids.map((id) =>
        fetch(`/api/listings/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ),
    ).then((rows) => {
      if (cancelled) return;
      setProperties(rows.filter(Boolean) as Property[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [compare.ids]);

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-[color:var(--fg-muted)]">Yükleniyor…</div>;
  }

  if (properties.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="size-20 rounded-3xl bg-gold-400/15 text-gold-300 flex items-center justify-center mx-auto">
          <GitCompare size={36} />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Henüz karşılaştırılacak ilan yok</h1>
        <p className="mt-2 text-[color:var(--fg-muted)]">
          İlan kartlarındaki <GitCompare size={14} className="inline text-gold-300" /> butonuyla en fazla {MAX_COMPARE} ilan seçebilirsin.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/listings"><Button variant="gold" size="lg"><ArrowLeft size={15} /> İlanlara Dön</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <Badge variant="ai" className="mb-2"><GitCompare size={11} /> Karşılaştırma</Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {properties.length} ilanı karşılaştır
          </h1>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">Tüm özellikler yan yana — en uygun olanı seç.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/listings"><Button variant="outline" size="md"><Plus size={14} /> İlan Ekle</Button></Link>
          <Button variant="ghost" size="md" onClick={() => compare.clear()} className="text-danger hover:bg-danger/10">
            Hepsini Kaldır
          </Button>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-6">
        {properties.map((p) => (
          <MobileCompareCard key={p.id} property={p} displayCurrency={displayCurrency} onRemove={() => compare.remove(p.id)} />
        ))}
      </div>

      {/* Desktop: side-by-side table */}
      <Card className="hidden md:block overflow-x-auto">
        <CardBody className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs uppercase text-[color:var(--fg-muted)] font-medium p-4 w-44 sticky left-0 bg-[color:var(--bg-card)] z-10">
                  Özellik
                </th>
                {properties.map((p) => (
                  <th key={p.id} className="text-left p-4 min-w-[280px]">
                    <div className="relative">
                      <button
                        onClick={() => compare.remove(p.id)}
                        aria-label="Kaldır"
                        className="absolute -top-2 -right-2 size-8 rounded-full bg-[color:var(--bg-elev)] border border-[color:var(--border-strong)] hover:border-danger hover:text-danger flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                      <Link href={`/property/${p.slug}`}>
                        {/* PP-02: guard against empty/missing cover URLs and swallow load errors
                            so /compare never logs noisy "GET <empty> 404" console errors. */}
                        <img
                          src={(p.cover.kind === 'photo' ? p.cover.src : p.images[0]) || PLACEHOLDER_IMG}
                          alt={p.title}
                          className="w-full aspect-[4/3] rounded-xl object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.dataset.fallback !== '1') {
                              img.dataset.fallback = '1';
                              img.src = PLACEHOLDER_IMG;
                            }
                          }}
                        />
                        <div className="mt-2 font-semibold leading-tight line-clamp-2 hover:text-gold-300">{p.title}</div>
                        <div className="text-xs text-[color:var(--fg-muted)] mt-1">{p.city} · {p.district}</div>
                      </Link>
                    </div>
                  </th>
                ))}
                {/* Boş yer için ek seçim sütunu */}
                {properties.length < MAX_COMPARE && (
                  <th className="text-left p-4 min-w-[200px] align-top">
                    <Link
                      href="/listings"
                      className="block aspect-[4/3] rounded-xl border-2 border-dashed border-[color:var(--border-strong)] hover:border-gold-400/60 hover:text-gold-300 transition-colors flex flex-col items-center justify-center text-[color:var(--fg-muted)]"
                    >
                      <Plus size={28} />
                      <span className="text-sm mt-2">İlan ekle</span>
                      <span className="text-[10px] mt-0.5">({MAX_COMPARE - properties.length} boş)</span>
                    </Link>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {buildRows(properties, displayCurrency).map((row) => (
                <CompareRow key={row.label} {...row} count={properties.length} />
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

interface RowSpec {
  label: string;
  values: React.ReactNode[];
  /** En iyi indeks (vurgulanır) */
  bestIdx?: number;
  group?: string;
}

function buildRows(items: Property[], display: Currency): RowSpec[] {
  const rows: RowSpec[] = [];

  // Fiyat — en düşük = en iyi (display currency'de göster, USD bazında karşılaştır)
  const usdPrices = items.map((p) => convert(p.price, p.currency, 'USD'));
  const bestPrice = usdPrices.indexOf(Math.min(...usdPrices));
  rows.push({
    label: 'Fiyat',
    values: items.map((p) => {
      const shown = Math.round(convert(p.price, p.currency, display));
      return (
        <div>
          <div className="text-lg font-bold text-gold-300">{formatPrice(shown, display)}</div>
          {p.currency !== display && (
            <div className="text-[10px] text-[color:var(--fg-muted)]">
              {CURRENCY_SYMBOLS[p.currency]}{formatNumber(p.price)} {p.currency}
            </div>
          )}
        </div>
      );
    }),
    bestIdx: bestPrice,
  });

  // m² fiyatı — en düşük en iyi
  const sqmUsd = items.map((p) => convert(p.price / Math.max(1, p.area.net), p.currency, 'USD'));
  rows.push({
    label: 'Net m² fiyatı',
    values: items.map((p) => {
      const v = Math.round(convert(p.price / Math.max(1, p.area.net), p.currency, display));
      return `${CURRENCY_SYMBOLS[display]}${formatNumber(v)} /m²`;
    }),
    bestIdx: sqmUsd.indexOf(Math.min(...sqmUsd)),
  });

  // AI skoru — en yüksek en iyi
  const scores = items.map((p) => p.score.total);
  rows.push({
    label: 'AI Yatırım Skoru',
    values: items.map((p) => <ScoreRing value={p.score.total} size={44} stroke={4} outOf={10} />),
    bestIdx: scores.indexOf(Math.max(...scores)),
  });

  // Bölge
  rows.push({
    label: 'Konum',
    values: items.map((p) => `${p.city} / ${p.district}${p.neighborhood ? ' / ' + p.neighborhood : ''}`),
  });

  // Tip & Amaç
  rows.push({ label: 'Tür', values: items.map((p) => PROPERTY_TYPE_LABEL[p.type] ?? p.type) });
  rows.push({ label: 'Amaç', values: items.map((p) => PURPOSE_LABEL[p.purpose] ?? p.purpose) });

  // Boyut
  const nets = items.map((p) => p.area.net);
  rows.push({ label: 'Net m²', values: items.map((p) => `${p.area.net} m²`), bestIdx: nets.indexOf(Math.max(...nets)) });
  rows.push({ label: 'Brüt m²', values: items.map((p) => `${p.area.gross} m²`) });
  rows.push({ label: 'Oda', values: items.map((p) => p.rooms) });
  rows.push({ label: 'Banyo', values: items.map((p) => p.bathrooms) });

  // Bina
  const ages = items.map((p) => p.buildingAge);
  rows.push({ label: 'Bina yaşı', values: items.map((p) => p.buildingAge === 0 ? 'Sıfır' : `${p.buildingAge} yıl`), bestIdx: ages.indexOf(Math.min(...ages)) });
  rows.push({ label: 'Bulunduğu kat', values: items.map((p) => formatFloor(p.floor)) });
  rows.push({ label: 'Toplam kat', values: items.map((p) => p.totalFloors) });
  rows.push({ label: 'Isıtma', values: items.map((p) => p.heating) });
  rows.push({ label: 'Otopark', values: items.map((p) => PARKING_LABEL[p.parking] ?? p.parking) });

  // Özellikler
  rows.push({ label: 'Asansör', values: items.map((p) => p.elevator ? '✓' : '—') });
  rows.push({ label: 'Balkon', values: items.map((p) => p.balcony ? '✓' : '—') });
  rows.push({ label: 'Eşyalı', values: items.map((p) => p.furnished ? '✓' : '—') });
  rows.push({ label: 'Havuz', values: items.map((p) => p.pool ? '✓' : '—') });
  rows.push({ label: 'Spor salonu', values: items.map((p) => p.gym ? '✓' : '—') });
  rows.push({ label: 'Sauna', values: items.map((p) => p.sauna ? '✓' : '—') });
  rows.push({ label: 'Site içi', values: items.map((p) => p.inSite ? '✓' : '—') });

  // Tapu / durum
  rows.push({ label: 'Tapu', values: items.map((p) => TITLE_DEED_LABEL[p.titleDeed] ?? p.titleDeed) });
  rows.push({ label: 'Durum', values: items.map((p) => STATUS_LABEL[p.status] ?? p.status) });
  rows.push({ label: 'Sahibi', values: items.map((p) => OWNER_TYPE_LABEL[p.ownerType] ?? p.ownerType) });
  rows.push({ label: 'ISTBAKU Onaylı', values: items.map((p) => p.istbakuApproved ? <Badge variant="success">Seviye {p.approvalLevel}</Badge> : '—') });

  // Kira yield
  rows.push({
    label: 'Kira getirisi',
    values: items.map((p) => `~%${(p.score.rentYield / 10).toFixed(1)}/yıl`),
    bestIdx: items.map((p) => p.score.rentYield).indexOf(Math.max(...items.map((p) => p.score.rentYield))),
  });

  return rows;
}

function CompareRow({ label, values, bestIdx, count }: RowSpec & { count: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-4 text-xs text-[color:var(--fg-muted)] uppercase font-medium sticky left-0 bg-[color:var(--bg-card)] z-10">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            'p-4 text-sm align-top',
            bestIdx === i && 'bg-gold-400/8 border-l-2 border-gold-400/40 relative',
          )}
        >
          {bestIdx === i && (
            <span className="absolute top-1 right-2 text-[9px] uppercase tracking-wider font-bold text-gold-300 inline-flex items-center gap-0.5">
              <Sparkles size={9} /> En iyi
            </span>
          )}
          {v}
        </td>
      ))}
      {count < MAX_COMPARE && <td className="p-4" />}
    </tr>
  );
}

function MobileCompareCard({ property: p, displayCurrency, onRemove }: { property: Property; displayCurrency: Currency; onRemove: () => void }) {
  const [open, setOpen] = React.useState(true);
  const shownPrice = Math.round(convert(p.price, p.currency, displayCurrency));
  const shownSqm = Math.round(convert(p.price / Math.max(1, p.area.net), p.currency, displayCurrency));
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <Link href={`/property/${p.slug}`} className="shrink-0">
            {/* PP-02: same defensive fallback for the mobile compare card thumbnail. */}
            <img
              src={(p.cover.kind === 'photo' ? p.cover.src : p.images[0]) || PLACEHOLDER_IMG}
              alt={p.title}
              className="size-20 rounded-xl object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallback !== '1') {
                  img.dataset.fallback = '1';
                  img.src = PLACEHOLDER_IMG;
                }
              }}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/property/${p.slug}`} className="font-semibold text-sm leading-tight line-clamp-2 hover:text-gold-300">{p.title}</Link>
            <div className="text-xs text-[color:var(--fg-muted)] mt-1">{p.city} / {p.district}</div>
            <div className="text-base font-bold text-gold-300 mt-1">{formatPrice(shownPrice, displayCurrency)}</div>
          </div>
          <button
            onClick={onRemove}
            className="size-9 rounded-lg hover:bg-danger/10 hover:text-danger flex items-center justify-center"
            aria-label="Kaldır"
          >
            <X size={16} />
          </button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full mt-3 px-3 py-2 rounded-lg border border-dashed text-xs text-[color:var(--fg-muted)] inline-flex items-center justify-center gap-1"
        >
          {open ? 'Detayları gizle' : 'Detayları göster'}
          <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="mt-3 space-y-1.5 text-sm">
            <Row k="Net m²" v={`${p.area.net} m²`} />
            <Row k="Oda" v={p.rooms} />
            <Row k="Banyo" v={p.bathrooms} />
            <Row k="Bina yaşı" v={p.buildingAge === 0 ? 'Sıfır' : `${p.buildingAge} yıl`} />
            <Row k="m² fiyatı" v={`${CURRENCY_SYMBOLS[displayCurrency]}${formatNumber(shownSqm)}/m²`} />
            <Row k="AI Skor" v={<strong className="text-gold-300">{(p.score.total / 10).toFixed(1)}/10</strong>} />
            <Row k="ISTBAKU Onaylı" v={p.istbakuApproved ? '✓ Seviye ' + p.approvalLevel : '—'} />
            <Row k="Isıtma" v={p.heating} />
            <Row k="Otopark" v={PARKING_LABEL[p.parking]} />
            <Row k="Tapu" v={TITLE_DEED_LABEL[p.titleDeed] ?? p.titleDeed} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed py-1.5">
      <span className="text-xs text-[color:var(--fg-muted)]">{k}</span>
      <span className="font-medium text-sm">{v}</span>
    </div>
  );
}

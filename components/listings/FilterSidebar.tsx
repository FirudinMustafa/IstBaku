'use client';

import * as React from 'react';
import { Filter, Check, RotateCcw, ChevronDown } from 'lucide-react';
import { Input, Label, Select } from '@/components/ui/Input';
import type { FilterState, PropertyType, OwnerType } from '@/lib/types';
import { citiesOf, districtsOf } from '@/lib/data/locations';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/layout/LangProvider';
import { useCurrency } from '@/lib/currency-store';
import { convert, CURRENCY_SYMBOLS } from '@/lib/currency';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  /** İstemcide gösterilen sayı (mobile sheet için) */
  resultCount?: number;
  /** Dinamik ülke listesi — DB'den çekilip ListingsClient üzerinden geçer. */
  countries?: { code: string; label: string; flag: string }[];
}

const TYPE_KEYS: { value: PropertyType; key: string }[] = [
  { value: 'konut', key: 'type.konut' },
  { value: 'luks_konut', key: 'type.luks_konut' },
  { value: 'villa', key: 'type.villa' },
  { value: 'is_yeri', key: 'type.is_yeri' },
  { value: 'arsa', key: 'type.arsa' },
  { value: 'proje', key: 'type.proje' },
  { value: 'bina', key: 'type.bina' },
  { value: 'turistik_tesis', key: 'type.turistik_tesis' },
  { value: 'devre_mulk', key: 'type.devre_mulk' },
];

const ROOMS = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'];
const FEATURE_KEYS = [
  { k: 'pool', key: 'feat.pool' }, { k: 'gym', key: 'feat.gym' }, { k: 'sauna', key: 'feat.sauna' },
  { k: 'elevator', key: 'feat.elevator' }, { k: 'parking', key: 'feat.parking' }, { k: 'balcony', key: 'feat.balcony' },
  { k: 'furnished', key: 'feat.furnished' }, { k: 'inSite', key: 'feat.inSite' },
];
const HEATING_KEYS = [
  { k: 'kombi', key: 'heat.kombi' }, { k: 'merkezi', key: 'heat.merkezi' },
  { k: 'yerden', key: 'heat.yerden' }, { k: 'yok', key: 'heat.yok' },
];
const OWNER_KEYS: { v: OwnerType; key: string }[] = [
  { v: 'sahibi', key: 'owner.sahibi' }, { v: 'emlakci', key: 'owner.emlakci' },
  { v: 'insaat', key: 'owner.insaat' }, { v: 'banka', key: 'owner.banka' },
];
const STATUS_KEYS = [
  { v: 'bos', key: 'status.bos' }, { v: 'kiracili', key: 'status.kiracili' }, { v: 'mulk_sahibi', key: 'status.mulk_sahibi' },
];

export function FilterSidebar({ filters, onChange, countries: countryList }: Props) {
  const { t } = useLang();
  const { currency: displayCurrency } = useCurrency();

  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const toggle = <K extends keyof FilterState>(key: K, val: string) => {
    const cur = (filters[key] as string[] | undefined) ?? [];
    const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    set({ [key]: (next.length === 0 ? undefined : next) as FilterState[K] });
  };

  const reset = () => onChange({ sort: filters.sort });

  // PU-01: filter price input adopts the active display currency. The canonical
  // value persisted in FilterState (`minPrice`/`maxPrice`) stays in USD so the
  // query layer can compare apples-to-apples; we only convert at the UI edge.
  const minInDisplay = filters.minPrice != null
    ? Math.round(convert(filters.minPrice, 'USD', displayCurrency))
    : undefined;
  const maxInDisplay = filters.maxPrice != null
    ? Math.round(convert(filters.maxPrice, 'USD', displayCurrency))
    : undefined;

  const onMinChange = (raw: string) => {
    if (raw === '') return set({ minPrice: undefined });
    const v = +raw;
    if (!Number.isFinite(v)) return;
    set({ minPrice: Math.round(convert(v, displayCurrency, 'USD')) });
  };
  const onMaxChange = (raw: string) => {
    if (raw === '') return set({ maxPrice: undefined });
    const v = +raw;
    if (!Number.isFinite(v)) return;
    set({ maxPrice: Math.round(convert(v, displayCurrency, 'USD')) });
  };

  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-2 pl-0.5 pb-4 space-y-3 min-w-0">
      <div className="hidden lg:flex items-center justify-between">
        <h3 className="font-semibold inline-flex items-center gap-2"><Filter size={16} /> {t('filter.title')}</h3>
        <button onClick={reset} className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300 inline-flex items-center gap-1">
          <RotateCcw size={11} /> {t('filter.reset')}
        </button>
      </div>

      <Section title={t('filter.purpose')} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'sale', l: t('filter.purpose.sale') },
            { v: 'rent', l: t('filter.purpose.rent') },
          ].map((o) => (
            <Chip key={o.v} active={filters.purpose === o.v} onClick={() => set({ purpose: filters.purpose === o.v ? undefined : (o.v as 'sale' | 'rent') })}>
              {o.l}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.country')} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {(countryList && countryList.length > 0
            ? countryList
            : [
                { code: 'TR', label: 'Türkiye', flag: '🇹🇷' },
                { code: 'AZ', label: 'Azerbaycan', flag: '🇦🇿' },
              ]
          ).map((c) => (
            <Chip
              key={c.code}
              active={filters.country === c.code}
              onClick={() => set({
                country: filters.country === c.code ? undefined : c.code,
                city: undefined,
                district: undefined,
              })}
            >
              {c.flag} {c.label}
            </Chip>
          ))}
        </div>
      </Section>

      {filters.country && (
        <Section title={t('filter.cityDistrict')} defaultOpen>
          <Label className="!mb-1 !text-[10px]">{t('filter.city')}</Label>
          <Select value={filters.city ?? ''} onChange={(e) => set({ city: e.target.value || undefined, district: undefined })}>
            <option value="">{t('filter.allCities')}</option>
            {citiesOf(filters.country).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </Select>
          {filters.city && (
            <>
              <Label className="!mb-1 !mt-3 !text-[10px]">{t('filter.district')}</Label>
              <Select value={filters.district ?? ''} onChange={(e) => set({ district: e.target.value || undefined })}>
                <option value="">{t('filter.allDistricts')}</option>
                {districtsOf(filters.country, filters.city).map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </>
          )}
        </Section>
      )}

      <Section title={t('filter.propertyType')} defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_KEYS.map((typ) => (
            <Chip
              key={typ.value}
              active={filters.type?.includes(typ.value)}
              onClick={() => toggle('type', typ.value)}
            >
              {t(typ.key)}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title={`${t('filter.priceRange')} (${CURRENCY_SYMBOLS[displayCurrency]} ${displayCurrency})`} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label={`${t('filter.minPrice')} (${displayCurrency})`}
            type="number"
            min={0}
            placeholder={t('filter.min')}
            value={minInDisplay ?? ''}
            onChange={(e) => onMinChange(e.target.value)}
          />
          <Input
            aria-label={`${t('filter.maxPrice')} (${displayCurrency})`}
            type="number"
            min={0}
            placeholder={t('filter.max')}
            value={maxInDisplay ?? ''}
            onChange={(e) => onMaxChange(e.target.value)}
          />
        </div>
      </Section>

      <Section title={t('filter.rooms')}>
        <div className="flex flex-wrap gap-1.5">
          {ROOMS.map((r) => (
            <Chip key={r} active={filters.rooms?.includes(r)} onClick={() => toggle('rooms', r)}>{r}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.bathrooms')}>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} active={filters.bathrooms === n} onClick={() => set({ bathrooms: filters.bathrooms === n ? undefined : n })}>
              {n}+
            </Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.netArea')}>
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label={t('filter.minNetArea')} type="number" min={0} placeholder={t('filter.min')} value={filters.minArea ?? ''} onChange={(e) => set({ minArea: e.target.value ? +e.target.value : undefined })} />
          <Input aria-label={t('filter.maxNetArea')} type="number" min={0} placeholder={t('filter.max')} value={filters.maxArea ?? ''} onChange={(e) => set({ maxArea: e.target.value ? +e.target.value : undefined })} />
        </div>
      </Section>

      <Section title={t('filter.grossArea')}>
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label={t('filter.minGrossArea')} type="number" min={0} placeholder={t('filter.min')} value={filters.minGrossArea ?? ''} onChange={(e) => set({ minGrossArea: e.target.value ? +e.target.value : undefined })} />
          <Input aria-label={t('filter.maxGrossArea')} type="number" min={0} placeholder={t('filter.max')} value={filters.maxGrossArea ?? ''} onChange={(e) => set({ maxGrossArea: e.target.value ? +e.target.value : undefined })} />
        </div>
      </Section>

      <Section title={t('filter.building')}>
        <Label className="!mb-1 !text-[10px]">{t('filter.buildingAge')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder={t('filter.min')} value={filters.buildingMinAge ?? ''} onChange={(e) => set({ buildingMinAge: e.target.value ? +e.target.value : undefined })} />
          <Input type="number" placeholder={t('filter.max')} value={filters.buildingMaxAge ?? ''} onChange={(e) => set({ buildingMaxAge: e.target.value ? +e.target.value : undefined })} />
        </div>
        <Label className="!mb-1 !mt-3 !text-[10px]">{t('filter.floor')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder={t('filter.min')} value={filters.minFloor ?? ''} onChange={(e) => set({ minFloor: e.target.value !== '' ? +e.target.value : undefined })} />
          <Input type="number" placeholder={t('filter.max')} value={filters.maxFloor ?? ''} onChange={(e) => set({ maxFloor: e.target.value !== '' ? +e.target.value : undefined })} />
        </div>
        <Label className="!mb-1.5 !mt-3 !text-[10px]">{t('filter.heating')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {HEATING_KEYS.map((h) => (
            <Chip key={h.k} active={filters.heating?.includes(h.k)} onClick={() => toggle('heating', h.k)}>{t(h.key)}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.features')}>
        <div className="grid grid-cols-2 gap-1.5">
          {FEATURE_KEYS.map((f) => (
            <Chip key={f.k} active={filters.features?.includes(f.k)} onClick={() => toggle('features', f.k)}>{t(f.key)}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.owner')}>
        <div className="flex flex-wrap gap-1.5">
          {OWNER_KEYS.map((o) => (
            <Chip key={o.v} active={filters.ownerType?.includes(o.v)} onClick={() => toggle('ownerType', o.v)}>{t(o.key)}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.unitStatus')}>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_KEYS.map((s) => (
            <Chip key={s.v} active={filters.status?.includes(s.v)} onClick={() => toggle('status', s.v)}>{t(s.key)}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('filter.publishedWithin')}>
        <Select value={filters.publishedWithin ?? ''} onChange={(e) => set({ publishedWithin: (e.target.value || undefined) as FilterState['publishedWithin'] })}>
          <option value="">{t('filter.published.all')}</option>
          <option value="today">{t('filter.published.today')}</option>
          <option value="3d">{t('filter.published.3d')}</option>
          <option value="7d">{t('filter.published.7d')}</option>
          <option value="30d">{t('filter.published.30d')}</option>
          <option value="90d">{t('filter.published.90d')}</option>
        </Select>
      </Section>

      <Section title={t('filter.extras')}>
        <div className="flex flex-col gap-2">
          <CheckLine label={t('filter.extras.approved')} checked={!!filters.istbakuApproved} onChange={(v) => set({ istbakuApproved: v || undefined })} />
          <CheckLine label={t('filter.extras.video')} checked={!!filters.withVideo} onChange={(v) => set({ withVideo: v || undefined })} />
          <CheckLine label={t('filter.extras.360')} checked={!!filters.with360} onChange={(v) => set({ with360: v || undefined })} />
          <CheckLine label={t('filter.extras.swappable')} checked={!!filters.swappable} onChange={(v) => set({ swappable: v || undefined })} />
        </div>
      </Section>

    </aside>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-dashed pb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider font-medium text-[color:var(--fg-muted)] py-1.5"
      >
        {title}
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs border transition-colors',
        active
          ? 'bg-gold-400/15 border-gold-400/50 text-gold-300'
          : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)] text-[color:var(--fg)]',
      )}
    >
      {children}
    </button>
  );
}

function CheckLine({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span
        className={`size-4 rounded-md border flex items-center justify-center transition-colors ${
          checked ? 'bg-gold-400 border-gold-400 text-navy-900' : 'border-[color:var(--border-strong)]'
        }`}
      >
        {checked && <Check size={11} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

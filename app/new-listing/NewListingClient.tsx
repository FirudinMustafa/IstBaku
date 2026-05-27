'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Camera, X, Play, Image as ImgIcon, Upload, Video,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Users, Briefcase, GraduationCap, Globe,
  ShieldCheck, Lock,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { LocationPicker } from '@/components/listings/LocationPicker';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/user-auth';
import { createListingAction } from '@/lib/listing-actions';
import { defaultCity, defaultDistrict } from '@/lib/data/locations';
import { cn } from '@/lib/utils';
import type { PropertyType } from '@/lib/types';
import { createListingSchema, fieldErrors } from '@/lib/schemas';

const STEPS = ['Tür', 'Konum', 'Detay', 'Medya', 'Kapak', 'Bölge', 'Yakın Çevre', 'İlan Seçenekleri', 'Günlük Kira'];

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'İstanbul': { lat: 41.015, lng: 28.97 },
  'Ankara': { lat: 39.92, lng: 32.85 },
  'İzmir': { lat: 38.42, lng: 27.14 },
  'Antalya': { lat: 36.89, lng: 30.71 },
  'Muğla': { lat: 37.21, lng: 28.36 },
  'Bursa': { lat: 40.18, lng: 29.06 },
  'Bakı': { lat: 40.40, lng: 49.86 },
  'Sumqayıt': { lat: 40.59, lng: 49.66 },
  'Gəncə': { lat: 40.68, lng: 46.36 },
};

interface NewListingClientProps {
  /** PB-04: forwarded from the RSC page. True when PAYMENT_PROVIDER_KEY is set. */
  paymentEnabled?: boolean;
  /** Dinamik ülke listesi — RSC page'den. Boşsa TR/AZ fallback. */
  countries?: { code: string; label: string; flag: string }[];
}

// PF-06: bump this whenever the persisted shape changes so old drafts are dropped.
const DRAFT_STORAGE_KEY = 'istbaku.newListing.v1';

// PF-09: empty-state sentinels for step 1. The user has to actively pick both
// purpose and type before "İleri" advances.
type PurposeOrEmpty = 'sale' | 'rent' | '';
type TypeOrEmpty = PropertyType | '';

export function NewListingClient({ paymentEnabled = false, countries: countryList }: NewListingClientProps) {
  const dynamicCountries = countryList && countryList.length > 0
    ? countryList
    : [
        { code: 'TR', label: 'Türkiye', flag: '🇹🇷' },
        { code: 'AZ', label: 'Azerbaycan', flag: '🇦🇿' },
      ];
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready, isAuthenticated } = useUser();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/auth/sign-in');
  }, [ready, isAuthenticated, router]);

  const [form, setForm] = React.useState({
    // PF-09: empty defaults so user must actively pick.
    type: '' as TypeOrEmpty,
    purpose: '' as PurposeOrEmpty,
    country: 'TR' as string,
    city: defaultCity('TR'),
    district: defaultDistrict('TR', defaultCity('TR')),
    neighborhood: '',
    address: '',
    lat: 0,
    lng: 0,
    rooms: '2+1',
    bathrooms: 1,
    netArea: 100,
    grossArea: 120,
    floor: 3,
    totalFloors: 8,
    buildingAge: 5,
    heating: 'Kombi',
    parking: 'kapali' as 'kapali' | 'acik' | 'yok',
    price: 250000,
    currency: 'USD',
    description: '',
    tier: 'standart' as 'standart' | 'premium',
    isPrivate: false,
    coverKind: 'photo' as 'photo' | 'video',
    coverPhotoIndex: 0,
    region: { aile: 40, memur: 25, ogrenci: 15, yabanci: 12 },
    // PR6 — Yakın çevre (step 6)
    nearby: {
      metro:   { name: '', minutes: 0, km: 0 },
      okul:    { name: '', minutes: 0, km: 0 },
      hastane: { name: '', minutes: 0, km: 0 },
      avm:     { name: '', minutes: 0, km: 0 },
      park:    { name: '', minutes: 0, km: 0 },
      eczane:  { name: '', minutes: 0, km: 0 },
      eglence: { name: '', minutes: 0, km: 0 },
      markets: [{ name: '', minutes: 0, km: 0 }] as { name: string; minutes: number; km: number }[],
    },
    // PR5 — Günlük kira (step 8)
    dailyRentalEnabled: false,
    dailyRentalPricePerNight: 0,
    dailyRentalCurrency: 'USD' as 'USD' | 'EUR' | 'TRY' | 'AZN',
    dailyRentalMinNights: 1,
    dailyRentalNotes: '',
  });

  const [photos, setPhotos] = React.useState<string[]>([]);
  const [coverVideo, setCoverVideo] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const [publishing, setPublishing] = React.useState(false);

  // PF-06: rehydrate from sessionStorage on mount and persist on every change
  // so browser back/forward (which re-mounts this client component) does NOT
  // lose step-2 (or any other step's) data. sessionStorage keeps drafts
  // tab-scoped — closing the tab still discards them.
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        form?: Partial<typeof form>;
        photos?: string[];
        coverVideo?: string;
        step?: number;
      };
      if (saved.form) setForm((f) => ({ ...f, ...saved.form }));
      if (Array.isArray(saved.photos)) setPhotos(saved.photos);
      if (typeof saved.coverVideo === 'string') setCoverVideo(saved.coverVideo);
      if (typeof saved.step === 'number' && saved.step >= 0 && saved.step < STEPS.length) {
        setStep(saved.step);
      }
    } catch {
      // Corrupt draft — ignore and start fresh.
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !hydratedRef.current) return;
    try {
      window.sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ form, photos, coverVideo, step }),
      );
    } catch {
      // Quota or disabled storage — silently degrade.
    }
  }, [form, photos, coverVideo, step]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const cityCenter = CITY_CENTERS[form.city] ?? CITY_CENTERS['İstanbul'];

  function handlePhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, 12 - photos.length);
    const accepted = Array.from(files).slice(0, remaining);
    const readers = accepted.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then((dataUrls) => {
      setPhotos((cur) => [...cur, ...dataUrls]);
    });
  }

  function handleVideo(file: File | null) {
    if (!file) return;
    if (file.size > 60 * 1024 * 1024) {
      toast({ variant: 'error', title: 'Video çok büyük', description: 'Maks. 60 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCoverVideo(String(reader.result));
    reader.readAsDataURL(file);
  }

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-[color:var(--fg-muted)]">Yükleniyor…</div>;
  }
  if (!user) return null;

  function next() {
    // PF-09: step-1 (Tür) must require an active selection. We no longer
    // pre-fill purpose/type, so the user has to click both. The İleri button
    // is also disabled in the JSX (`disabled={!step1Ready}`) — this is the
    // backstop in case someone bypasses that via Enter / scripting.
    if (step === 0 && (!form.purpose || !form.type)) {
      toast({ variant: 'error', title: 'Bir tür seç', description: 'Satılık/Kiralık ve emlak türünü seçmelisin.' });
      return;
    }
    if (step === 1 && (!form.city.trim() || !form.district.trim())) {
      toast({ variant: 'error', title: 'Eksik alan', description: 'Şehir ve ilçe/rayon zorunlu.' });
      return;
    }
    if (step === 1 && (!form.address || form.address.trim().length < 3)) {
      toast({ variant: 'error', title: 'Adres zorunlu', description: 'Lütfen açık adresi gir (en az 3 karakter).' });
      return;
    }
    if (step === 1 && (form.lat === 0 || form.lng === 0)) {
      toast({ variant: 'error', title: 'Konum seçilmedi', description: 'Haritadan konumu işaretle.' });
      return;
    }
    if (step === 2 && form.price <= 0) {
      toast({ variant: 'error', title: 'Fiyat zorunlu', description: 'Geçerli bir fiyat gir.' });
      return;
    }
    if (step === 2 && form.netArea <= 0) {
      toast({ variant: 'error', title: 'Net m² zorunlu', description: 'Net alan 0\'dan büyük olmalı.' });
      return;
    }
    if (step === 2 && form.grossArea <= 0) {
      toast({ variant: 'error', title: 'Brüt m² zorunlu', description: 'Brüt alan 0\'dan büyük olmalı.' });
      return;
    }
    // PU-05: enforce description min-length at the step-2 → step-3 transition so
    // users learn about the requirement early (not only at publish-time).
    if (step === 2 && form.description.trim().length < 20) {
      toast({
        variant: 'error',
        title: 'Açıklama çok kısa',
        description: `En az 20 karakter olmalı (şu an ${form.description.trim().length}).`,
      });
      return;
    }
    if (step === 3 && photos.length < 3) {
      toast({ variant: 'error', title: 'En az 3 foto gerekli' });
      return;
    }
    if (step === 4 && form.coverKind === 'video' && !coverVideo) {
      toast({ variant: 'error', title: 'Kapak videosu gerekli', description: 'Bilgisayarından bir video seç.' });
      return;
    }
    setStep((s) => s + 1);
  }

  async function publish() {
    // PB-04: premium tier requires a configured payment provider. The server
    // action would reject it too, but blocking client-side gives the user a
    // clearer message and keeps the wizard from looking like it accepts free
    // premium upgrades.
    if (form.tier === 'premium' && !paymentEnabled) {
      toast({
        variant: 'error',
        title: 'Premium ödeme aktif değil',
        description: 'Premium tier ödeme sistemi henüz yapılandırılmadı.',
      });
      return;
    }
    // MC-14: validate full payload before hitting the server action.
    const payload = {
      type: form.type,
      purpose: form.purpose,
      country: form.country,
      city: form.city,
      district: form.district,
      neighborhood: form.neighborhood || undefined,
      address: form.address,
      lat: form.lat,
      lng: form.lng,
      // rooms is a free-form string in component state; zod narrows it to the union.
      rooms: form.rooms,
      bathrooms: form.bathrooms,
      netArea: form.netArea,
      grossArea: form.grossArea,
      floor: form.floor,
      totalFloors: form.totalFloors,
      buildingAge: form.buildingAge,
      heating: form.heating,
      parking: form.parking,
      price: form.price,
      currency: form.currency,
      description: form.description,
      tier: form.tier,
      coverKind: form.coverKind,
      coverPhotoIndex: Math.min(Math.max(0, form.coverPhotoIndex), Math.max(0, photos.length - 1)),
      photoDataUrls: photos,
      coverVideoDataUrl: form.coverKind === 'video' ? coverVideo || undefined : undefined,
      region: form.region,
      nearby: Object.fromEntries(
        Object.entries(form.nearby).map(([k, v]) => {
          if (k === 'markets') return [k, (v as { name: string; minutes: number; km: number }[]).filter((m) => m.name.trim() !== '')];
          return (v && typeof v === 'object' && 'name' in v && !(v as { name: string }).name.trim()) ? [k, undefined] : [k, v];
        }),
      ),
      dailyRentalEnabled: form.dailyRentalEnabled,
      dailyRentalPricePerNight: form.dailyRentalEnabled ? form.dailyRentalPricePerNight : undefined,
      dailyRentalCurrency: form.dailyRentalEnabled ? form.dailyRentalCurrency : undefined,
      dailyRentalMinNights: form.dailyRentalEnabled ? form.dailyRentalMinNights : undefined,
      dailyRentalNotes: form.dailyRentalEnabled ? (form.dailyRentalNotes || undefined) : undefined,
    };
    const parsed = createListingSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = fieldErrors(parsed);
      const first = Object.values(errs)[0] ?? 'Form bilgilerini kontrol et';
      toast({ variant: 'error', title: 'Doğrulama hatası', description: first });
      return;
    }
    setPublishing(true);

    // Fotoğrafları önce client-side'dan Blob'a upload et (büyük payload'ları önler)
    let uploadedPhotoUrls: string[];
    try {
      uploadedPhotoUrls = await Promise.all(
        photos.map(async (dataUrl, idx) => {
          if (dataUrl.startsWith('http')) return dataUrl;
          // data URL → Blob conversion
          const [header, b64] = dataUrl.split(',');
          const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          const fd = new FormData();
          fd.append('file', blob, `photo-${idx + 1}.jpg`);
          const uploadRes = await fetch('/api/listings/upload', { method: 'POST', body: fd });
          const json = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(json.error || 'Fotoğraf yüklenemedi');
          return json.url as string;
        }),
      );
    } catch (err) {
      setPublishing(false);
      toast({ variant: 'error', title: 'Fotoğraf yükleme hatası', description: err instanceof Error ? err.message : 'Lütfen tekrar dene.' });
      return;
    }

    const res = await createListingAction({
      type: parsed.data.type,
      purpose: parsed.data.purpose,
      country: parsed.data.country,
      city: parsed.data.city,
      district: parsed.data.district,
      neighborhood: parsed.data.neighborhood,
      address: parsed.data.address,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      rooms: parsed.data.rooms,
      bathrooms: parsed.data.bathrooms,
      netArea: parsed.data.netArea,
      grossArea: parsed.data.grossArea,
      floor: parsed.data.floor,
      totalFloors: parsed.data.totalFloors,
      buildingAge: parsed.data.buildingAge,
      heating: parsed.data.heating,
      parking: parsed.data.parking,
      price: parsed.data.price,
      currency: parsed.data.currency,
      description: parsed.data.description,
      tier: parsed.data.tier,
      coverKind: parsed.data.coverKind,
      coverPhotoIndex: parsed.data.coverPhotoIndex,
      photoDataUrls: uploadedPhotoUrls,
      coverVideoDataUrl: parsed.data.coverVideoDataUrl,
      region: parsed.data.region,
      nearby: parsed.data.nearby,
      dailyRentalEnabled: parsed.data.dailyRentalEnabled,
      dailyRentalPricePerNight: parsed.data.dailyRentalPricePerNight,
      dailyRentalCurrency: parsed.data.dailyRentalCurrency,
      dailyRentalMinNights: parsed.data.dailyRentalMinNights,
      dailyRentalNotes: parsed.data.dailyRentalNotes,
    });
    setPublishing(false);
    if (res.ok) {
      // PF-06: clear the in-flight draft on success so a subsequent visit
      // starts with a clean wizard instead of rehydrating a now-published
      // listing.
      try {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      toast({
        variant: 'success',
        title: 'İlanın yayınlandı!',
        description: form.tier === 'premium' ? 'Admin onayı bekleniyor (ISTBAKU Onaylı süreci).' : 'Yayında ve aramada görünür.',
      });
      setTimeout(() => router.push(`/property/${res.slug}`), 600);
    } else {
      toast({ variant: 'error', title: 'Yayınlanamadı', description: res.error });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-32 md:pb-10">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="gold"><Sparkles size={11} /> İlan Yükle</Badge>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">İlanını yayınla</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">7 adımda yatırımcının önünde ol.</p>
      </div>

      <div className="mt-6 md:mt-8 flex items-center justify-between gap-1 text-xs overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 text-center min-w-[44px]">
            <div className={cn(
              'mx-auto size-7 rounded-full flex items-center justify-center mb-1 border text-xs',
              i < step && 'bg-success/20 border-success text-success',
              i === step && 'bg-gold-400 border-gold-400 text-navy-900 font-bold',
              i > step && 'border-[color:var(--border)] text-[color:var(--fg-muted)]',
            )}>{i + 1}</div>
            <div className={cn('text-[10px]', i === step ? 'text-gold-300 font-medium' : 'text-[color:var(--fg-muted)]')}>{s}</div>
          </div>
        ))}
      </div>

      <Card className="mt-4 md:mt-6">
        <CardBody className="p-5 md:p-8">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold">Ne ilan veriyorsun?</h2>
              <p className="mt-1 text-sm text-[color:var(--fg-muted)]">İki seçim de zorunlu — varsayılan yok.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[{ v: 'sale' as const, l: 'Satılık' }, { v: 'rent' as const, l: 'Kiralık' }].map((o) => (
                  <button key={o.v} onClick={() => set({ purpose: o.v })} aria-pressed={form.purpose === o.v} className={cn('rounded-xl border p-4 font-medium', form.purpose === o.v ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}>
                    {o.l}
                  </button>
                ))}
              </div>
              <h2 className="text-lg font-semibold mt-7">Emlak türü</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { v: 'konut', l: 'Konut' }, { v: 'luks_konut', l: 'Lüks Konut' },
                  { v: 'villa', l: 'Villa' }, { v: 'is_yeri', l: 'İş Yeri' },
                  { v: 'arsa', l: 'Arsa' }, { v: 'proje', l: 'Proje' },
                ].map((o) => (
                  <button key={o.v} onClick={() => set({ type: o.v as PropertyType })} aria-pressed={form.type === o.v} className={cn('rounded-xl border p-3 text-sm', form.type === o.v ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}>
                    {o.l}
                  </button>
                ))}
              </div>
              {(!form.purpose || !form.type) && (
                <p role="status" className="mt-4 text-xs text-[color:var(--fg-muted)]">
                  İleri için Satılık/Kiralık <strong>ve</strong> emlak türü seç.
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Konum</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Ülke</Label>
                  <Select value={form.country} onChange={(e) => set({ country: e.target.value })}>
                    {dynamicCountries.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                    ))}
                  </Select>
                </div>
                <div />
                <LocationSelector
                  country={form.country}
                  city={form.city}
                  district={form.district}
                  onCityChange={(c) => set({ city: c, lat: 0, lng: 0 })}
                  onDistrictChange={(d) => set({ district: d })}
                />
                <div className="sm:col-span-2"><Label>Mahalle (opsiyonel)</Label><Input value={form.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} placeholder="Örn: Etiler" /></div>
                <div className="sm:col-span-2"><Label>Açık adres</Label><Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Cadde, no, kapı..." /></div>
              </div>
              <div>
                <Label>Haritada tam konumu işaretle</Label>
                <LocationPicker
                  lat={form.lat || undefined}
                  lng={form.lng || undefined}
                  onChange={(lat, lng) => set({ lat, lng })}
                  center={cityCenter}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <h2 className="sm:col-span-2 text-lg font-semibold">Detaylar</h2>
              <div><Label>Oda sayısı</Label>
                <Select value={form.rooms} onChange={(e) => set({ rooms: e.target.value })}>
                  {['1+0', '1+1', '2+1', '3+1', '4+1', '5+1', '6+1'].map((r) => <option key={r}>{r}</option>)}
                </Select>
              </div>
              <div><Label>Banyo sayısı</Label>
                <Select value={form.bathrooms} onChange={(e) => set({ bathrooms: +e.target.value })}>
                  {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
              </div>
              <div><Label>Net m²</Label><Input type="number" value={form.netArea} onChange={(e) => set({ netArea: +e.target.value })} /></div>
              <div><Label>Brüt m²</Label><Input type="number" value={form.grossArea} onChange={(e) => set({ grossArea: +e.target.value })} /></div>
              <div><Label>Bina yaşı</Label><Input type="number" value={form.buildingAge} onChange={(e) => set({ buildingAge: +e.target.value })} /></div>
              <div><Label>Bulunduğu kat</Label><Input type="number" value={form.floor} onChange={(e) => set({ floor: +e.target.value })} /></div>
              <div><Label>Toplam kat</Label><Input type="number" value={form.totalFloors} onChange={(e) => set({ totalFloors: +e.target.value })} /></div>
              <div><Label>Isıtma</Label>
                <Select value={form.heating} onChange={(e) => set({ heating: e.target.value })}>
                  {['Kombi', 'Merkezi', 'Merkezi (Doğalgaz)', 'Yerden ısıtma', 'Klima', 'Yok'].map((h) => <option key={h}>{h}</option>)}
                </Select>
              </div>
              <div><Label>Otopark</Label>
                <Select value={form.parking} onChange={(e) => set({ parking: e.target.value as typeof form.parking })}>
                  <option value="kapali">Kapalı otopark</option>
                  <option value="acik">Açık otopark</option>
                  <option value="yok">Yok</option>
                </Select>
              </div>
              <div><Label>Fiyat</Label><Input type="number" value={form.price} onChange={(e) => set({ price: +e.target.value })} /></div>
              <div><Label>Para Birimi</Label>
                <Select value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {['USD', 'EUR', 'TRY', 'AZN'].map((c) => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="İlanın hakkında detaylı açıklama yaz. Bölgenin avantajları, daire içi özellikler, yakın çevre..."
                  className={cn(
                    form.description.trim().length > 0 && form.description.trim().length < 20 && 'ring-2 ring-danger/60 border-danger',
                  )}
                  aria-invalid={form.description.trim().length > 0 && form.description.trim().length < 20 ? 'true' : undefined}
                />
                {/* PU-05: inline counter; turns red once user has typed but is still below threshold. */}
                <div
                  className={cn(
                    'mt-1 text-[11px] tabular-nums',
                    form.description.trim().length === 0
                      ? 'text-[color:var(--fg-muted)]'
                      : form.description.trim().length < 20
                      ? 'text-danger font-medium'
                      : 'text-[color:var(--fg-muted)]',
                  )}
                >
                  {form.description.trim().length} / 20
                  {form.description.trim().length > 0 && form.description.trim().length < 20 && ' · En az 20 karakter'}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">Fotoğraflar</h2>
              {/* PF-08: keep the server-side ≥3 requirement strict (image quality
                  is the #1 driver of inquiries), but update the copy so users
                  learn about it on first paint — not after a failed click. */}
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                <strong>En az 3 fotoğraf yükleyin</strong> (maks. 12). Bilgisayar/telefondaki gerçek fotoğrafları seç.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotos(e.target.files)}
                className="sr-only"
              />

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((src, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-[color:var(--bg-card-hover)]">
                    <img src={src} alt={`Foto ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                      aria-label="Sil"
                    >
                      <X size={13} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded-full">1. foto</span>
                    )}
                  </div>
                ))}
                {photos.length < 12 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed border-[color:var(--border-strong)] flex flex-col items-center justify-center gap-1 text-[color:var(--fg-muted)] hover:text-gold-300 hover:border-gold-400/60 transition-colors"
                  >
                    <Camera size={20} />
                    <div className="text-xs font-medium">Foto Ekle</div>
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] text-[color:var(--fg-faint)]">
                {photos.length}/12 yüklendi · ilk foto kart kapağı olarak da kullanılır
              </p>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold">Kart Kapağı</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                İlan kartında ilk görünecek şey. Fotoğraf seçersen 1. foton kapak olur. Video seçersen kullanıcı mouse'u kartın üstüne getirince otomatik oynar.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set({ coverKind: 'photo' })}
                  className={cn('rounded-2xl border p-5 text-left', form.coverKind === 'photo' ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}
                >
                  <ImgIcon size={20} />
                  <div className="mt-2 font-semibold">Fotoğraf Kapak</div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-1">Yüklediğin fotoğraflardan birini kapak yap.</p>
                </button>
                <button
                  type="button"
                  onClick={() => set({ coverKind: 'video' })}
                  className={cn('rounded-2xl border p-5 text-left', form.coverKind === 'video' ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}
                >
                  <Play size={20} />
                  <div className="mt-2 font-semibold">Video Kapak <Badge variant="premium" className="!text-[10px] ml-1">Premium</Badge></div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-1">Hover'da otomatik oynar — daha çok dikkat çeker.</p>
                </button>
              </div>

              {form.coverKind === 'photo' ? (
                <div className="mt-5">
                  <Label>Kapak fotoğrafı seç</Label>
                  {photos.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-[color:var(--fg-muted)]">
                      Önce "Medya" adımında fotoğraf yükle.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => set({ coverPhotoIndex: i })}
                          className={cn(
                            'relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all',
                            form.coverPhotoIndex === i ? 'border-gold-400 ring-2 ring-gold-400/40' : 'border-transparent',
                          )}
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          {form.coverPhotoIndex === i && (
                            <span className="absolute top-1.5 right-1.5 rounded-full bg-gold-400 text-navy-900 text-[10px] font-bold px-1.5 py-0.5">KAPAK</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <Label>Kapak videosu yükle (MP4, maks. 60 MB)</Label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => handleVideo(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {coverVideo ? (
                    <div className="space-y-2">
                      <div className="aspect-video rounded-xl overflow-hidden border bg-[color:var(--bg-card-hover)]">
                        <video src={coverVideo} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()}>
                          <Video size={13} /> Değiştir
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCoverVideo('')} className="text-danger hover:bg-danger/10">
                          <X size={13} /> Kaldır
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-[color:var(--border-strong)] p-8 flex flex-col items-center justify-center gap-2 text-[color:var(--fg-muted)] hover:text-gold-300 hover:border-gold-400/60 transition-colors"
                    >
                      <Upload size={24} />
                      <div className="text-sm font-medium">Video Seç</div>
                      <div className="text-[11px] text-[color:var(--fg-faint)]">15–60 sn önerilir</div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <RegionStep value={form.region} onChange={(region) => set({ region })} />
          )}

          {step === 6 && (
            <NearbyStep value={form.nearby} onChange={(nearby) => set({ nearby })} />
          )}

          {step === 8 && (
            <div>
              <h2 className="text-lg font-semibold">Günlük Kira (opsiyonel)</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                İlanını günlük kiralanabilir yap — misafirler takvim üzerinden rezervasyon talep eder,
                sen onayla veya reddet.
              </p>

              <label className="mt-5 flex items-start gap-3 rounded-2xl border p-4 cursor-pointer bg-[color:var(--bg-elev)]">
                <input
                  type="checkbox"
                  checked={form.dailyRentalEnabled}
                  onChange={(e) => set({ dailyRentalEnabled: e.target.checked })}
                  className="mt-0.5 size-4 accent-gold-400"
                />
                <div>
                  <div className="font-semibold">Günlük kiralanabilir</div>
                  <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">
                    İlan detay sayfasında takvim açılır. Rezervasyon talepleri panele düşer.
                  </div>
                </div>
              </label>

              {form.dailyRentalEnabled && (
                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Gecelik fiyat</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.dailyRentalPricePerNight || ''}
                      onChange={(e) => set({ dailyRentalPricePerNight: +e.target.value })}
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <Label>Para birimi</Label>
                    <Select
                      value={form.dailyRentalCurrency}
                      onChange={(e) => set({ dailyRentalCurrency: e.target.value as typeof form.dailyRentalCurrency })}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="TRY">TRY</option>
                      <option value="AZN">AZN</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Minimum gece</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={form.dailyRentalMinNights}
                      onChange={(e) => set({ dailyRentalMinNights: Math.max(1, +e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Ev kuralları / not (opsiyonel)</Label>
                    <Input
                      value={form.dailyRentalNotes}
                      onChange={(e) => set({ dailyRentalNotes: e.target.value })}
                      placeholder="Sigara içilmez, evcil hayvan kabul edilir, vb."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div>
              <h2 className="text-lg font-semibold">İlan Seçenekleri</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">İlanını öne çıkar veya gizli portföye al.</p>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {/* Option 1: IstBaku Onaylı Rozet */}
                <button
                  type="button"
                  onClick={() => {
                    if (form.tier === 'premium') {
                      // Deselect — back to standart
                      set({ tier: 'standart' });
                    } else {
                      // Select premium, deselect private
                      set({ tier: 'premium', isPrivate: false });
                    }
                  }}
                  data-testid="option-premium"
                  className={cn(
                    'rounded-2xl border p-5 text-left transition-all',
                    form.tier === 'premium'
                      ? 'border-gold-400 bg-gold-400/10 ring-2 ring-gold-400/30'
                      : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className={form.tier === 'premium' ? 'text-gold-300' : 'text-[color:var(--fg-muted)]'} />
                    <div className="font-bold">IstBaku Onayli Rozet Al</div>
                  </div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-2">
                    İlanın kontrol edilir, onaylanırsa öne çıkarılır ve premium rozet alır.
                  </p>
                  <div className="mt-3 text-gold-300 font-bold">$49</div>
                </button>

                {/* Option 2: Gizli Portföy */}
                <button
                  type="button"
                  onClick={() => {
                    if (form.isPrivate) {
                      // Deselect
                      set({ isPrivate: false });
                    } else {
                      // Validate price >= 500K
                      if (form.price < 500000) {
                        toast({
                          variant: 'error',
                          title: 'Gizli portföy kullanılamaz',
                          description: 'Gizli portföy sadece $500.000 ve üzeri ilanlar için geçerlidir.',
                        });
                        return;
                      }
                      // Validate KYC
                      if (user?.kycStatus !== 'approved') {
                        toast({
                          variant: 'error',
                          title: 'KYC doğrulaması gerekli',
                          description: 'Gizli portföy için KYC doğrulamanızın onaylanmış olması gerekir.',
                        });
                        return;
                      }
                      // Select private, deselect premium
                      set({ isPrivate: true, tier: 'standart' });
                    }
                  }}
                  data-testid="option-private"
                  className={cn(
                    'rounded-2xl border p-5 text-left transition-all',
                    form.isPrivate
                      ? 'border-gold-400 bg-gold-400/10 ring-2 ring-gold-400/30'
                      : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lock size={20} className={form.isPrivate ? 'text-gold-300' : 'text-[color:var(--fg-muted)]'} />
                    <div className="font-bold">Gizli Portföy Yap</div>
                  </div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-2">
                    İlanın sadece doğrulanmış kullanıcılara gösterilir.
                  </p>
                  <div className="mt-3 text-[color:var(--fg-muted)] text-xs font-medium">
                    Ücretsiz (sadece $500K+ ilanlar)
                  </div>
                </button>
              </div>

              {/* PB-04: inline notice when premium is selected but payment is off. */}
              {form.tier === 'premium' && !paymentEnabled && (
                <div
                  role="alert"
                  data-testid="premium-payment-notice"
                  className="mt-4 rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm flex items-start gap-3"
                >
                  <AlertCircle size={16} className="text-danger mt-0.5" />
                  <div>
                    <strong>Premium tier ödeme sistemi henüz yapılandırılmadı.</strong>{' '}
                    Standart tier ile devam edebilirsiniz.
                  </div>
                </div>
              )}

              {form.tier === 'premium' && paymentEnabled && (
                <div
                  className="mt-4 rounded-xl bg-gold-500/10 border border-gold-500/30 p-4 text-sm flex items-start gap-3"
                >
                  <ShieldCheck size={16} className="text-gold-300 mt-0.5" />
                  <div>
                    Premium ilan ücreti yayınlama sırasında otomatik olarak işlenir.
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-xl bg-[color:var(--bg-elev)] border border-[color:var(--border)] p-4 text-sm flex items-start gap-3">
                <AlertCircle size={16} className="text-[color:var(--fg-muted)] mt-0.5 shrink-0" />
                <div className="text-[color:var(--fg-muted)]">
                  Hiçbirini seçmezsen ilanın standart olarak yayınlanır.
                </div>
              </div>
            </div>
          )}

          {(() => {
            // PF-08 + PF-09 + PB-04: disable İleri/Yayınla when the active
            // step's preconditions aren't met. Keeping these in one block
            // means both the desktop and mobile button rows reuse the same
            // truth-table without drifting.
            const step1Incomplete = step === 0 && (!form.purpose || !form.type);
            const photosShort = step === 3 && photos.length < 3;
            // PF-08: also disable İleri while the photo minimum isn't met,
            // so the requirement is surfaced on first paint (not after click).
            const nextDisabled = step1Incomplete || photosShort;
            const publishDisabled = publishing || (form.tier === 'premium' && !paymentEnabled);
            return (
              <div className="mt-8 hidden md:flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ArrowLeft size={14} /> Geri
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button
                    variant="gold"
                    onClick={next}
                    disabled={nextDisabled}
                    aria-disabled={nextDisabled ? 'true' : undefined}
                    data-testid="wizard-next"
                  >
                    {photosShort ? (
                      'En az 3 fotoğraf yükleyin'
                    ) : (
                      <>İleri <ArrowRight size={14} /></>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="gold"
                    onClick={publish}
                    loading={publishing}
                    disabled={publishDisabled}
                    aria-disabled={publishDisabled ? 'true' : undefined}
                    data-testid="wizard-publish"
                  >
                    <CheckCircle2 size={14} /> Yayınla
                  </Button>
                )}
              </div>
            );
          })()}
        </CardBody>
      </Card>

      <div
        className="md:hidden fixed inset-x-0 bottom-16 z-30 bg-[color:var(--bg-card)] border-t border-[color:var(--border-strong)] px-3 py-2.5 flex items-center gap-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        <Button variant="outline" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="!h-12 !px-3">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 text-center text-xs text-[color:var(--fg-muted)]">
          <strong className="text-gold-300">{step + 1}</strong> / {STEPS.length} · {STEPS[step]}
        </div>
        {step < STEPS.length - 1 ? (
          <Button
            variant="gold"
            size="lg"
            className="!h-12"
            onClick={next}
            disabled={
              (step === 0 && (!form.purpose || !form.type)) ||
              (step === 3 && photos.length < 3)
            }
            data-testid="wizard-next-mobile"
          >
            İleri <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            variant="gold"
            size="lg"
            className="!h-12"
            onClick={publish}
            loading={publishing}
            disabled={publishing || (form.tier === 'premium' && !paymentEnabled)}
            data-testid="wizard-publish-mobile"
          >
            <CheckCircle2 size={16} /> Yayınla
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Region Step — smart cap: toplam asla 100'ü geçemez
// ============================================================

type RegionShape = { aile: number; memur: number; ogrenci: number; yabanci: number };
type RegionKey = keyof RegionShape;

/* PR6 — Yakın çevre yapısal girişi */
interface NearbyShape {
  metro:   { name: string; minutes: number; km: number };
  okul:    { name: string; minutes: number; km: number };
  hastane: { name: string; minutes: number; km: number };
  avm:     { name: string; minutes: number; km: number };
  park:    { name: string; minutes: number; km: number };
  eczane:  { name: string; minutes: number; km: number };
  eglence: { name: string; minutes: number; km: number };
  markets: { name: string; minutes: number; km: number }[];
}

function NearbyStep({ value, onChange }: { value: NearbyShape; onChange: (v: NearbyShape) => void }) {
  type PoiKey = Exclude<keyof NearbyShape, 'markets'>;
  const FIELDS: { key: PoiKey; label: string; placeholder: string }[] = [
    { key: 'metro',   label: 'Metro / Toplu Taşıma', placeholder: 'Örn: Beşiktaş metro, M2 hattı' },
    { key: 'okul',    label: 'Okul',                 placeholder: 'Örn: İlköğretim okulu' },
    { key: 'hastane', label: 'Hastane',              placeholder: 'Örn: Özel Acıbadem' },
    { key: 'avm',     label: 'AVM',                  placeholder: 'Örn: Zorlu Center' },
    { key: 'park',    label: 'Park / Yeşil Alan',    placeholder: 'Örn: Macka Parkı' },
    { key: 'eczane',  label: 'Eczane',               placeholder: 'Örn: Mahalle eczanesi' },
    { key: 'eglence', label: 'Restoran / Cafe',      placeholder: 'Örn: Cafe sokağı' },
  ];

  const updateField = (key: PoiKey, patch: Partial<NearbyShape[PoiKey]>) => {
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  };

  const addMarket = () => {
    onChange({ ...value, markets: [...value.markets, { name: '', minutes: 0, km: 0 }] });
  };
  const updateMarket = (idx: number, patch: Partial<NearbyShape['markets'][number]>) => {
    const next = value.markets.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...value, markets: next });
  };
  const removeMarket = (idx: number) => {
    // Never remove the first market row — it's always visible by default
    if (idx === 0) return;
    onChange({ ...value, markets: value.markets.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Yakın Çevre</h2>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">
          İlana yakın yerleri spesifik isimleriyle gir — örneğin <strong>&ldquo;Bravo Süpermarket&rdquo;</strong>, <strong>&ldquo;Migros 5M&rdquo;</strong>.
          Tümünü doldurman gerekmez, boş bırakırsan o POI gösterilmez.
        </p>
      </div>

      {FIELDS.map((f) => (
        <div key={f.key} className="rounded-xl border p-3 bg-[color:var(--bg-elev)]">
          <Label className="!text-xs !font-semibold">{f.label}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2 mt-1.5">
            <Input
              value={value[f.key].name}
              onChange={(e) => updateField(f.key, { name: e.target.value })}
              placeholder={f.placeholder}
            />
            <Input
              type="number"
              min={0}
              value={value[f.key].minutes || ''}
              onChange={(e) => updateField(f.key, { minutes: +e.target.value })}
              placeholder="Dk"
            />
            <Input
              type="number"
              min={0}
              step="0.1"
              value={value[f.key].km || ''}
              onChange={(e) => updateField(f.key, { km: +e.target.value })}
              placeholder="Km"
            />
          </div>
        </div>
      ))}

      {/* Marketler — birden çok */}
      <div className="rounded-xl border p-3 bg-[color:var(--bg-elev)]">
        <div className="flex items-center justify-between">
          <Label className="!text-xs !font-semibold !mb-0">Marketler (Bravo, Migros, A101, vb.)</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addMarket} className="!h-8">
            + Market ekle
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {value.markets.map((m, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
              <Input
                value={m.name}
                onChange={(e) => updateMarket(idx, { name: e.target.value })}
                placeholder="Örn: Bravo Süpermarket"
              />
              <Input
                type="number"
                min={0}
                value={m.minutes || ''}
                onChange={(e) => updateMarket(idx, { minutes: +e.target.value })}
                placeholder="Dk"
              />
              <Input
                type="number"
                min={0}
                step="0.1"
                value={m.km || ''}
                onChange={(e) => updateMarket(idx, { km: +e.target.value })}
                placeholder="Km"
              />
              {/* First market row is always visible — only show remove for additional rows */}
              {idx > 0 ? (
                <button
                  type="button"
                  onClick={() => removeMarket(idx)}
                  className="size-9 rounded-lg border hover:bg-danger/10 hover:text-danger hover:border-danger/30 flex items-center justify-center"
                  aria-label="Marketi kaldır"
                >
                  ✕
                </button>
              ) : (
                <div className="size-9" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegionStep({ value, onChange }: { value: RegionShape; onChange: (v: RegionShape) => void }) {
  const total = value.aile + value.memur + value.ogrenci + value.yabanci;
  const other = Math.max(0, 100 - total);

  function update(key: RegionKey, requested: number) {
    requested = Math.max(0, Math.min(100, requested));
    const next: RegionShape = { ...value, [key]: requested };
    const otherKeys: RegionKey[] = (['aile', 'memur', 'ogrenci', 'yabanci'] as RegionKey[]).filter((k) => k !== key);
    const otherSum = otherKeys.reduce((s, k) => s + next[k], 0);
    const room = 100 - requested;

    // Diğerleri sığarsa dokunmayız — sadece "Diğer" değişir.
    // Sığmazsa orantısal şekilde küçültürüz.
    if (otherSum > room) {
      if (otherSum === 0 || room <= 0) {
        otherKeys.forEach((k) => { next[k] = 0; });
      } else {
        const ratio = room / otherSum;
        otherKeys.forEach((k) => { next[k] = Math.floor(next[k] * ratio); });
        // Yuvarlama yüzünden eksik kaldıysa en büyüğüne ekle
        const newOtherSum = otherKeys.reduce((s, k) => s + next[k], 0);
        const diff = room - newOtherSum;
        if (diff > 0) {
          const biggest = otherKeys.reduce((a, b) => (next[a] >= next[b] ? a : b));
          next[biggest] += diff;
        }
      }
    }
    onChange(next);
  }

  const rows: { key: RegionKey; label: string; icon: typeof Users; color: string }[] = [
    { key: 'aile', label: 'Aile', icon: Users, color: '#CAAE99' },
    { key: 'memur', label: 'Memur', icon: Briefcase, color: '#6366f1' },
    { key: 'ogrenci', label: 'Öğrenci', icon: GraduationCap, color: '#10b981' },
    { key: 'yabanci', label: 'Yabancı Uyruklu', icon: Globe, color: '#e3d6c8' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold">Bölge Profili</h2>
      <p className="text-sm text-[color:var(--fg-muted)] mt-1">
        Bölgede genellikle kimler yaşıyor? Sliderları oynat — toplam otomatik 100'de tutulur, kalan kısım <strong>Diğer</strong> olarak işaretlenir. Yanlış yapamazsın 🙂
      </p>

      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="inline-flex items-center gap-2">
                <r.icon size={14} style={{ color: r.color }} /> {r.label}
              </span>
              <span className="font-bold tabular-nums" style={{ color: r.color }}>%{value[r.key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={value[r.key]}
              onChange={(e) => update(r.key, +e.target.value)}
              className="w-full accent-gold-400 cursor-pointer"
            />
          </div>
        ))}

        <div className="pt-3 border-t border-dashed">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-[color:var(--fg-muted)]">Diğer (otomatik)</span>
            <span className="font-bold tabular-nums text-[color:var(--fg-muted)]">%{other}</span>
          </div>
          <div className="h-2 rounded-full bg-[color:var(--bg-card-hover)] overflow-hidden">
            <div className="h-full bg-[color:var(--border-strong)] transition-[width] duration-300" style={{ width: `${other}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

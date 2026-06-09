'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Camera, X, Play, Image as ImgIcon, Upload, Video,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Users, Briefcase, GraduationCap, Globe,
  ShieldCheck, Lock, GripVertical, MapPin, Sparkles as SparklesIcon,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Label, Select } from '@/components/ui/Input';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { LocationPicker } from '@/components/listings/LocationPicker';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { useCurrency } from '@/lib/currency-store';
import { formatUsdCents } from '@/lib/currency';
import { useUser } from '@/lib/user-auth';
import { createListingAction } from '@/lib/listing-actions';
import { createWizardExtrasPaymentAction, applyWizardPrivateAction } from '@/lib/listing-owner-actions';
import { PaymentModal, type PendingPayment } from '@/components/payments/PaymentModal';
import { defaultCity, defaultDistrict } from '@/lib/data/locations';
import { neighborhoodsOf } from '@/lib/data/neighborhoods';
import { cn } from '@/lib/utils';
import type { PropertyType } from '@/lib/types';
import { createListingSchema, fieldErrors } from '@/lib/schemas';
import { ROOM_OPTIONS, HOUSING_TYPE_OPTIONS, ENERGY_CLASS_OPTIONS, FACADE_OPTIONS, BUILDING_STATUS_OPTIONS, STRUCTURE_TYPE_OPTIONS } from '@/lib/constants/listing-options';
import { formShows, amenitiesFor } from '@/lib/labels';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

const BASE_STEPS = ['wz.step.type', 'wz.step.location', 'wz.step.detail', 'wz.step.media', 'wz.step.cover', 'wz.step.region', 'wz.step.nearby', 'wz.step.options'] as const;

/** HTML açıklamasının düz metin uzunluğu (etiketler hariç). */
function plainTextLen(html: string): number {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length;
}

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
  /** Admin'den ayarlanabilir ücretli eklenti fiyatları (USD cent). */
  prices?: { badge: number; private: number };
}

// PF-06: bump this whenever the persisted shape changes so old drafts are dropped.
const DRAFT_STORAGE_KEY = 'istbaku.newListing.v1';

// PF-09: empty-state sentinels for step 1. The user has to actively pick both
// purpose and type before "İleri" advances.
type PurposeOrEmpty = 'sale' | 'rent' | 'daily_rent' | '';
type TypeOrEmpty = PropertyType | '';

export function NewListingClient({ countries: countryList, prices }: NewListingClientProps) {
  // Fallback default'lar (RSC fiyat geçmezse).
  const badgePrice = prices?.badge ?? 4900;
  const privatePrice = prices?.private ?? 9900;
  const { currency } = useCurrency();
  // USD cent → kullanıcının seçtiği para biriminde gösterim (Madde 10).
  const usdLabel = (cents: number) => formatUsdCents(cents, currency);
  const dynamicCountries = countryList && countryList.length > 0
    ? countryList
    : [
        { code: 'TR', label: 'Türkiye', flag: '🇹🇷' },
        { code: 'AZ', label: 'Azerbaycan', flag: '🇦🇿' },
      ];
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
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
    customTitle: '',
    rooms: '2+1',
    bathrooms: 1,
    netArea: 0,
    grossArea: 0,
    floor: 0,
    totalFloors: 0,
    buildingAge: 0,
    heating: 'Kombi',
    parking: 'kapali' as 'kapali' | 'acik' | 'yok',
    price: 0,
    currency: 'USD',
    // Ek detaylar
    housingType: 'belirtilmemis' as string,
    energyClass: 'belirsiz' as string,
    facade: 'belirtilmemis' as string,
    buildingStatus: 'belirtilmemis' as string,
    structureType: 'belirtilmemis' as string,
    permitNo: '',
    parcelNo: '',
    dues: 0,
    deposit: 0,
    loanEligible: false,
    groundSurvey: false,
    // Arsa (type='arsa') alanları
    imarDurumu: '',
    paftaNo: '',
    adaNo: '',
    kaks: 0,
    gabari: '',
    ownerType: 'sahibi' as 'sahibi' | 'emlakci' | 'insaat' | 'banka',
    titleDeed: 'belirsiz' as 'kat_mulkiyeti' | 'kat_irtifaki' | 'arsa_payi' | 'cikti_belgesi' | 'belirsiz',
    occupancy: 'bos' as 'bos' | 'kiracili' | 'mulk_sahibi',
    elevator: false,
    furnished: false,
    balcony: false,
    pool: false,
    gym: false,
    inSite: false,
    swappable: false,
    siteName: '',
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
  // İlan sonu ücretli eklenti (rozet/gizli) ödeme penceresi durumu.
  const [pendingPayment, setPendingPayment] = React.useState<PendingPayment | null>(null);
  const paidContextRef = React.useRef<{ listingId: string; slug: string; gizli: boolean } | null>(null);

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
  const isDaily = form.purpose === 'daily_rent';
  const STEPS = isDaily ? [...BASE_STEPS, 'wz.step.daily'] : [...BASE_STEPS];

  /** Sayısal input yardımcısı: 0 → boş gösterilir; baştaki sıfır takılı kalmaz. */
  const numVal = (n: number) => (n === 0 ? '' : String(n));
  const numSet = (raw: string) => (raw === '' ? 0 : Math.max(0, Math.floor(Number(raw) || 0)));

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

  // Fotoğrafları sürükleyerek yeniden sırala — 1. foto (kapak) dahil her foto
  // taşınabilir. Sürüklenen indeksten hedef indekse taşır.
  const dragIndexRef = React.useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  function movePhoto(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setPhotos((cur) => {
      if (from >= cur.length || to >= cur.length) return cur;
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    // Kapak fotoğrafı indeksini taşımaya göre güncelle (kapak adımı 1. fotoyu baz alır).
    setForm((f) => {
      const ci = f.coverPhotoIndex ?? 0;
      let nci = ci;
      if (ci === from) nci = to;
      else if (from < ci && to >= ci) nci = ci - 1;
      else if (from > ci && to <= ci) nci = ci + 1;
      return nci === ci ? f : { ...f, coverPhotoIndex: nci };
    });
  }

  function handleVideo(file: File | null) {
    if (!file) return;
    if (file.size > 60 * 1024 * 1024) {
      toast({ variant: 'error', title: t('wz.toast.videoBig'), description: t('wz.toast.videoBigDesc') });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCoverVideo(String(reader.result));
    reader.readAsDataURL(file);
  }

  // Adresten otomatik konum (geocode) — yazılan adresi koordinata çevirir.
  const [geocoding, setGeocoding] = React.useState(false);
  async function geocodeFromAddress() {
    const parts = [form.address, form.neighborhood, form.district, form.city, form.country === 'AZ' ? 'Azerbaijan' : 'Turkey'].filter(Boolean);
    const q = parts.join(', ');
    if (!form.address || form.address.trim().length < 3) {
      toast({ variant: 'error', title: t('wz.toast.addrMissing'), description: t('wz.toast.addrMissingDesc') });
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        set({ lat: data.lat, lng: data.lng });
        toast({ variant: 'success', title: t('wz.toast.locFound'), description: t('wz.toast.locFoundDesc') });
      } else {
        toast({ variant: 'error', title: t('wz.toast.locNotFound'), description: t('wz.toast.locNotFoundDesc') });
      }
    } catch {
      toast({ variant: 'error', title: t('wz.toast.error'), description: t('wz.toast.locServiceDown') });
    } finally {
      setGeocoding(false);
    }
  }

  // Yakın çevreyi otomatik hesapla — lat/lng çevresindeki POI mesafeleri.
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  async function autoCalcNearby() {
    if (!form.lat || !form.lng) {
      toast({ variant: 'error', title: t('wz.toast.locRequired'), description: t('wz.toast.locRequiredDesc') });
      return;
    }
    setNearbyLoading(true);
    try {
      const res = await fetch(`/api/nearby?lat=${form.lat}&lng=${form.lng}`);
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok && data.nearby) {
        const merged = { ...form.nearby };
        for (const [k, v] of Object.entries(data.nearby as Record<string, { name: string; km: number; minutes: number }>)) {
          if (k === 'market') {
            merged.markets = [v]; // form'da market çoğul (dizi) tutulur
          } else if (k in merged) {
            (merged as Record<string, unknown>)[k] = v;
          }
        }
        set({ nearby: merged });
        const count = Object.keys(data.nearby).length;
        toast({ variant: count ? 'success' : 'info', title: count ? t('wz.toast.nearbyDone') : t('wz.toast.nearbyNone'), description: count ? undefined : t('wz.toast.nearbyNoneDesc') });
      } else {
        toast({ variant: 'error', title: t('wz.toast.calcFail'), description: t('wz.toast.locServiceDown') });
      }
    } catch {
      toast({ variant: 'error', title: t('wz.toast.error'), description: t('wz.toast.locServiceDown') });
    } finally {
      setNearbyLoading(false);
    }
  }

  // Konum belirlenince yakın çevreyi OTOMATİK hesapla (kullanıcı butona basmadan).
  // Aynı konum için tek sefer; nearby zaten elle doldurulmuşsa dokunma. 1sn debounce
  // ile harita pini oynatılırken tekrar tekrar Overpass'a gitmeyi önler.
  const autoNearbyKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!form.lat || !form.lng) return;
    const key = `${form.lat.toFixed(5)},${form.lng.toFixed(5)}`;
    if (autoNearbyKeyRef.current === key) return;
    const n = form.nearby ?? {};
    const hasNearby = Object.entries(n).some(([k, v]) =>
      k === 'markets' ? Array.isArray(v) && v.length > 0 : !!(v && (v as { name?: string }).name),
    );
    if (hasNearby) return;
    const id = setTimeout(() => { autoNearbyKeyRef.current = key; autoCalcNearby(); }, 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.lat, form.lng]);

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-[color:var(--fg-muted)]">{t('wz.loading')}</div>;
  }
  if (!user) return null;

  function next() {
    // PF-09: step-1 (Tür) must require an active selection. We no longer
    // pre-fill purpose/type, so the user has to click both. The İleri button
    // is also disabled in the JSX (`disabled={!step1Ready}`) — this is the
    // backstop in case someone bypasses that via Enter / scripting.
    if (step === 0 && (!form.purpose || !form.type)) {
      toast({ variant: 'error', title: t('wz.toast.pickType'), description: t('wz.toast.pickTypeDesc') });
      return;
    }
    if (step === 1 && (!form.city.trim() || !form.district.trim())) {
      toast({ variant: 'error', title: t('wz.toast.missingField'), description: t('wz.toast.cityDistrictReq') });
      return;
    }
    if (step === 1 && (!form.address || form.address.trim().length < 3)) {
      toast({ variant: 'error', title: t('wz.toast.addrReq'), description: t('wz.toast.addrReqDesc') });
      return;
    }
    if (step === 1 && (form.lat === 0 || form.lng === 0)) {
      toast({ variant: 'error', title: t('wz.toast.locNotPicked'), description: t('wz.toast.locNotPickedDesc') });
      return;
    }
    if (step === 2 && !isDaily && form.price <= 0) {
      toast({ variant: 'error', title: t('wz.toast.priceReq'), description: t('wz.toast.priceReqDesc') });
      return;
    }
    if (step === 2 && form.inSite && !form.siteName.trim()) {
      toast({ variant: 'error', title: t('wz.toast.siteNameReq'), description: t('wz.toast.siteNameReqDesc') });
      return;
    }
    if (step === 2 && form.netArea <= 0) {
      toast({ variant: 'error', title: t('wz.toast.netReq'), description: t('wz.toast.netReqDesc') });
      return;
    }
    if (step === 2 && form.grossArea <= 0) {
      toast({ variant: 'error', title: t('wz.toast.grossReq'), description: t('wz.toast.grossReqDesc') });
      return;
    }
    if (step === 2 && form.totalFloors < 1) {
      toast({ variant: 'error', title: t('wz.toast.totalFloorsReq'), description: t('wz.toast.totalFloorsReqDesc') });
      return;
    }
    // PU-05: enforce description min-length at the step-2 → step-3 transition so
    // users learn about the requirement early (not only at publish-time).
    if (step === 2 && plainTextLen(form.description) < 20) {
      toast({
        variant: 'error',
        title: t('wz.toast.descShort'),
        description: `${t('wz.desc.minChars')} (${plainTextLen(form.description)} / 20).`,
      });
      return;
    }
    if (step === 3 && photos.length < 3) {
      toast({ variant: 'error', title: t('wz.toast.photosMin') });
      return;
    }
    if (step === 4 && form.coverKind === 'video' && !coverVideo) {
      toast({ variant: 'error', title: t('wz.toast.coverVideoReq'), description: t('wz.toast.coverVideoReqDesc') });
      return;
    }
    setStep((s) => s + 1);
  }

  async function publish() {
    // Rozet (premium) ve gizli seçimleri ücretlidir; ilan ÖNCE standart/açık
    // oluşturulur, ödeme penceresi onaylanınca eklentiler uygulanır.
    const wantBadge = form.tier === 'premium';
    const wantGizli = form.isPrivate;
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
      // Arsa: M² olarak tek alan girilir; net/brüt aynı kabul edilir, kat alanları
      // arsa için anlamsız olduğundan validasyonu geçecek güvenli default'lar verilir.
      netArea: form.type === 'arsa' ? (form.netArea || form.grossArea || 0) : form.netArea,
      grossArea: form.type === 'arsa' ? (form.grossArea || form.netArea || 0) : form.grossArea,
      floor: form.floor,
      totalFloors: form.type === 'arsa' ? Math.max(1, form.totalFloors) : form.totalFloors,
      buildingAge: form.buildingAge,
      heating: form.heating,
      parking: form.parking,
      // Günlük kirada ana fiyat gecelik fiyattan türetilir
      price: isDaily ? (form.dailyRentalPricePerNight || 0) : form.price,
      currency: isDaily ? form.dailyRentalCurrency : form.currency,
      description: form.description,
      // Rozet ödeme sonrası uygulanır; ilan standart oluşturulur.
      tier: 'standart' as const,
      // Ek detaylar
      customTitle: form.customTitle?.trim() || undefined,
      housingType: form.housingType as 'belirtilmemis',
      energyClass: form.energyClass as 'belirsiz',
      facade: form.facade as 'belirtilmemis',
      buildingStatus: form.buildingStatus as 'belirtilmemis',
      structureType: form.structureType as 'belirtilmemis',
      permitNo: form.permitNo?.trim() || undefined,
      parcelNo: form.parcelNo?.trim() || undefined,
      dues: form.dues > 0 ? form.dues : undefined,
      ownerType: form.ownerType,
      titleDeed: form.titleDeed,
      occupancy: form.occupancy,
      elevator: form.elevator,
      furnished: form.furnished,
      balcony: form.balcony,
      pool: form.pool,
      gym: form.gym,
      inSite: form.inSite,
      swappable: form.swappable,
      deposit: form.deposit,
      loanEligible: form.loanEligible,
      groundSurvey: form.groundSurvey,
      imarDurumu: form.type === 'arsa' ? (form.imarDurumu?.trim() || undefined) : undefined,
      paftaNo: form.type === 'arsa' ? (form.paftaNo?.trim() || undefined) : undefined,
      adaNo: form.type === 'arsa' ? (form.adaNo?.trim() || undefined) : undefined,
      kaks: form.type === 'arsa' && form.kaks > 0 ? form.kaks : undefined,
      gabari: form.type === 'arsa' ? (form.gabari?.trim() || undefined) : undefined,
      siteName: form.inSite ? (form.siteName?.trim() || undefined) : undefined,
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
      dailyRentalEnabled: isDaily,
      dailyRentalPricePerNight: isDaily ? form.dailyRentalPricePerNight : undefined,
      dailyRentalCurrency: isDaily ? form.dailyRentalCurrency : undefined,
      dailyRentalMinNights: isDaily ? form.dailyRentalMinNights : undefined,
      dailyRentalNotes: isDaily ? (form.dailyRentalNotes || undefined) : undefined,
    };
    const parsed = createListingSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = fieldErrors(parsed);
      const first = Object.values(errs)[0] ?? t('wz.toast.checkForm');
      toast({ variant: 'error', title: t('wz.toast.validationErr'), description: first });
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
          if (!uploadRes.ok) throw new Error(json.error || t('wz.err.photoUploadFail'));
          return json.url as string;
        }),
      );
    } catch (err) {
      setPublishing(false);
      toast({ variant: 'error', title: t('wz.toast.photoUploadErr'), description: err instanceof Error ? err.message : t('wz.toast.tryAgain') });
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
      customTitle: parsed.data.customTitle,
      housingType: parsed.data.housingType,
      energyClass: parsed.data.energyClass,
      facade: parsed.data.facade,
      buildingStatus: parsed.data.buildingStatus,
      structureType: parsed.data.structureType,
      permitNo: parsed.data.permitNo,
      parcelNo: parsed.data.parcelNo,
      dues: parsed.data.dues,
      ownerType: parsed.data.ownerType,
      titleDeed: parsed.data.titleDeed,
      occupancy: parsed.data.occupancy,
      elevator: parsed.data.elevator,
      furnished: parsed.data.furnished,
      balcony: parsed.data.balcony,
      pool: parsed.data.pool,
      gym: parsed.data.gym,
      inSite: parsed.data.inSite,
      swappable: parsed.data.swappable,
      deposit: parsed.data.deposit,
      loanEligible: parsed.data.loanEligible,
      groundSurvey: parsed.data.groundSurvey,
      imarDurumu: parsed.data.imarDurumu,
      paftaNo: parsed.data.paftaNo,
      adaNo: parsed.data.adaNo,
      kaks: parsed.data.kaks,
      gabari: parsed.data.gabari,
      siteName: parsed.data.siteName,
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
    if (!res.ok) {
      toast({ variant: 'error', title: t('wz.toast.publishFail'), description: res.error });
      return;
    }

    // PF-06: clear the in-flight draft on success so a subsequent visit
    // starts with a clean wizard instead of rehydrating a now-published listing.
    try { window.sessionStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }

    // Ücretli eklenti seçilmişse ödeme penceresini aç; yoksa direkt yayında.
    if ((wantBadge || wantGizli) && res.id) {
      const pay = await createWizardExtrasPaymentAction(res.id, { badge: wantBadge, gizli: wantGizli });
      if (pay.ok && 'paymentId' in pay) {
        paidContextRef.current = { listingId: res.id, slug: res.slug, gizli: wantGizli };
        const parts = [wantBadge ? t('wz.opt.badgeItem') : null, wantGizli ? t('wz.opt.privateItem') : null].filter(Boolean);
        setPendingPayment({
          paymentId: pay.paymentId,
          amount: pay.amount,
          currency: pay.currency,
          checkoutUrl: 'checkoutUrl' in pay ? pay.checkoutUrl : undefined,
          title: t('wz.pay.extrasTitle'),
          description: parts.join(' + '),
        });
        return;
      }
      // Ödeme başlatılamadıysa ilan yine de yayında — uyar ve yönlendir.
      toast({ variant: 'success', title: t('wz.toast.published'), description: t('wz.toast.publishedNoPay') });
      setTimeout(() => router.push(`/property/${res.slug}`), 600);
      return;
    }

    toast({ variant: 'success', title: t('wz.toast.published'), description: t('wz.toast.publishedDesc') });
    setTimeout(() => router.push(`/property/${res.slug}`), 600);
  }

  // Ödeme penceresi başarıyla onaylanınca: gizli seçildiyse uygula, sonra yönlendir.
  async function onWizardPaid() {
    const ctx = paidContextRef.current;
    setPendingPayment(null);
    if (ctx?.gizli) {
      const r = await applyWizardPrivateAction(ctx.listingId);
      if (!r.ok) toast({ variant: 'error', title: t('wz.toast.privateApplyFail'), description: r.error });
    }
    toast({ variant: 'success', title: t('wz.toast.published'), description: t('wz.toast.publishedPaid') });
    const slug = ctx?.slug;
    setTimeout(() => router.push(slug ? `/property/${slug}` : '/dashboard'), 400);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-32 md:pb-10">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="gold"><Sparkles size={11} /> {t('wz.badge.upload')}</Badge>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{t('wz.sub.header')}</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">{t('wz.sub.tagline')}</p>
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
            <div className={cn('text-[10px]', i === step ? 'text-gold-300 font-medium' : 'text-[color:var(--fg-muted)]')}>{t(s)}</div>
          </div>
        ))}
      </div>

      <Card className="mt-4 md:mt-6">
        <CardBody className="p-5 md:p-8">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold">{t('wz.h.whatListing')}</h2>
              <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{t('wz.h.bothRequired')}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[{ v: 'sale' as const, l: 'wz.purpose.sale' }, { v: 'rent' as const, l: 'wz.purpose.rent' }, { v: 'daily_rent' as const, l: 'wz.purpose.daily' }].map((o) => (
                  <button key={o.v} onClick={() => set({ purpose: o.v })} aria-pressed={form.purpose === o.v} className={cn('rounded-xl border p-4 font-medium text-sm', form.purpose === o.v ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}>
                    {t(o.l)}
                  </button>
                ))}
              </div>
              <h2 className="text-lg font-semibold mt-7">{t('wz.h.propertyType')}</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { v: 'konut', l: 'wz.type.konut' }, { v: 'luks_konut', l: 'wz.type.luks_konut' },
                  { v: 'villa', l: 'wz.type.villa' }, { v: 'is_yeri', l: 'wz.type.is_yeri' },
                  { v: 'bina', l: 'wz.type.bina' }, { v: 'arsa', l: 'wz.type.arsa' }, { v: 'proje', l: 'wz.type.proje' },
                ].map((o) => (
                  <button key={o.v} onClick={() => set({ type: o.v as PropertyType })} aria-pressed={form.type === o.v} className={cn('rounded-xl border p-3 text-sm', form.type === o.v ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}>
                    {t(o.l)}
                  </button>
                ))}
              </div>
              {(!form.purpose || !form.type) && (
                <p role="status" className="mt-4 text-xs text-[color:var(--fg-muted)]">
                  {t('wz.step1Hint')}
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t('wz.h.location')}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>{t('wz.field.country')}</Label>
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
                <div className="sm:col-span-2">
                  <Label>{t('wz.field.neighborhood')}</Label>
                  <Input list="nl-nb-list" value={form.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} placeholder={t('wz.ph.neighborhood')} />
                  <datalist id="nl-nb-list">
                    {neighborhoodsOf(form.country, form.city, form.district).map((n) => <option key={n} value={n} />)}
                  </datalist>
                  <p className="mt-1 text-[11px] text-[color:var(--fg-faint)]">{t('wz.hint.neighborhood')}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label>{t('wz.field.address')}</Label>
                  <div className="flex gap-2">
                    <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder={t('wz.ph.address')} className="flex-1" />
                    <Button type="button" variant="outline" onClick={geocodeFromAddress} loading={geocoding} className="shrink-0">
                      <MapPin size={15} /> {t('wz.btn.findFromAddress')}
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-[color:var(--fg-faint)]">{t('wz.hint.address')}</p>
                </div>
              </div>
              <div>
                <Label>{t('wz.field.markOnMap')}</Label>
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
              <h2 className="sm:col-span-2 text-lg font-semibold">{t('wz.h.details')}</h2>
              <div className="sm:col-span-2"><Label>{t('wz.field.customTitle')}</Label>
                <Input value={form.customTitle} onChange={(e) => set({ customTitle: e.target.value })} maxLength={200} placeholder={t('wz.ph.customTitle')} />
              </div>

              {/* Arsa (type='arsa') alanları — Madde 15 */}
              {form.type === 'arsa' && (
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 rounded-xl border border-gold-400/30 bg-gold-400/5 p-4">
                  <h3 className="sm:col-span-2 text-sm font-semibold text-gold-300">{t('wz.land.title')}</h3>
                  <div><Label>{t('wz.field.imarDurumu')}</Label><Input value={form.imarDurumu} onChange={(e) => set({ imarDurumu: e.target.value })} maxLength={64} placeholder={t('wz.ph.imarDurumu')} /></div>
                  <div><Label>{t('wz.field.paftaNo')}</Label><Input value={form.paftaNo} onChange={(e) => set({ paftaNo: e.target.value })} maxLength={64} placeholder={t('wz.ph.optional')} /></div>
                  <div><Label>{t('wz.field.adaNo')}</Label><Input value={form.adaNo} onChange={(e) => set({ adaNo: e.target.value })} maxLength={64} placeholder={t('wz.ph.optional')} /></div>
                  <div><Label>{t('wz.field.kaks')}</Label><Input type="number" min={0} step="0.01" value={numVal(form.kaks)} onChange={(e) => set({ kaks: numSet(e.target.value) })} placeholder={t('wz.ph.kaks')} /></div>
                  <div><Label>{t('wz.field.gabari')}</Label><Input value={form.gabari} onChange={(e) => set({ gabari: e.target.value })} maxLength={32} placeholder={t('wz.ph.gabari')} /></div>
                </div>
              )}

              {/* Madde 3: alanlar ilan tipine göre gösterilir (arsa/iş yeri/bina farklı). */}
              {formShows(form.type, 'rooms') && (
                <div><Label>{form.type === 'is_yeri' || form.type === 'bina' ? t('wz.field.roomsCommercial') : t('wz.field.rooms')}</Label>
                  <Select value={form.rooms} onChange={(e) => set({ rooms: e.target.value })}>
                    {ROOM_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'bathrooms') && (
                <div><Label>{t('wz.field.bathrooms')}</Label>
                  <Select value={form.bathrooms} onChange={(e) => set({ bathrooms: +e.target.value })}>
                    {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'housingType') && (
                <div><Label>{t('wz.field.housingType')}</Label>
                  <Select value={form.housingType} onChange={(e) => set({ housingType: e.target.value })}>
                    {HOUSING_TYPE_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'energyClass') && (
                <div><Label>{t('wz.field.energyClass')}</Label>
                  <Select value={form.energyClass} onChange={(e) => set({ energyClass: e.target.value })}>
                    {ENERGY_CLASS_OPTIONS.map((en) => <option key={en.value} value={en.value}>{en.label}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'facade') && (
                <div><Label>{t('wz.field.facade')}</Label>
                  <Select value={form.facade} onChange={(e) => set({ facade: e.target.value })}>
                    {FACADE_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'buildingStatus') && (
                <div><Label>{t('wz.field.buildingStatus')}</Label>
                  <Select value={form.buildingStatus} onChange={(e) => set({ buildingStatus: e.target.value })}>
                    {BUILDING_STATUS_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'structureType') && (
                <div><Label>{t('wz.field.structureType')}</Label>
                  <Select value={form.structureType} onChange={(e) => set({ structureType: e.target.value })}>
                    {STRUCTURE_TYPE_OPTIONS.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </Select>
                </div>
              )}
              <div><Label>{t('wz.field.netArea')}</Label><Input type="number" min={0} value={numVal(form.netArea)} onChange={(e) => set({ netArea: numSet(e.target.value) })} placeholder={t('wz.ph.netArea')} /></div>
              <div><Label>{t('wz.field.grossArea')}</Label><Input type="number" min={0} value={numVal(form.grossArea)} onChange={(e) => set({ grossArea: numSet(e.target.value) })} placeholder={t('wz.ph.grossArea')} /></div>
              {formShows(form.type, 'buildingAge') && (
                <div><Label>{t('wz.field.buildingAge')}</Label><Input type="number" min={0} value={numVal(form.buildingAge)} onChange={(e) => set({ buildingAge: numSet(e.target.value) })} placeholder="0" /></div>
              )}
              {formShows(form.type, 'floor') && (
                <div><Label>{t('wz.field.floor')}</Label><Input type="number" value={numVal(form.floor)} onChange={(e) => set({ floor: numSet(e.target.value) })} placeholder="0" /></div>
              )}
              {formShows(form.type, 'totalFloors') && (
                <div><Label>{t('wz.field.totalFloors')}</Label><Input type="number" min={0} value={numVal(form.totalFloors)} onChange={(e) => set({ totalFloors: numSet(e.target.value) })} placeholder={t('wz.ph.totalFloors')} /></div>
              )}
              {formShows(form.type, 'dues') && (
                <div><Label>{t('wz.field.dues')}</Label><Input type="number" min={0} value={numVal(form.dues)} onChange={(e) => set({ dues: numSet(e.target.value) })} placeholder={t('wz.ph.duesEmpty')} /></div>
              )}
              {formShows(form.type, 'heating') && (
                <div><Label>{t('wz.field.heating')}</Label>
                  <Select value={form.heating} onChange={(e) => set({ heating: e.target.value })}>
                    {[
                      { v: 'Kombi', k: 'wz.heat.kombi' },
                      { v: 'Merkezi', k: 'wz.heat.merkezi' },
                      { v: 'Merkezi (Doğalgaz)', k: 'wz.heat.merkeziGaz' },
                      { v: 'Yerden ısıtma', k: 'wz.heat.yerden' },
                      { v: 'Klima', k: 'wz.heat.klima' },
                      { v: 'Yok', k: 'wz.heat.yok' },
                    ].map((h) => <option key={h.v} value={h.v}>{t(h.k)}</option>)}
                  </Select>
                </div>
              )}
              {formShows(form.type, 'parking') && (
                <div><Label>{t('wz.field.parking')}</Label>
                  <Select value={form.parking} onChange={(e) => set({ parking: e.target.value as typeof form.parking })}>
                    <option value="kapali">{t('wz.park.kapali')}</option>
                    <option value="acik">{t('wz.park.acik')}</option>
                    <option value="yok">{t('wz.park.yok')}</option>
                  </Select>
                </div>
              )}
              <div><Label>{t('wz.field.ownerType')}</Label>
                <Select value={form.ownerType} onChange={(e) => set({ ownerType: e.target.value as typeof form.ownerType })}>
                  <option value="sahibi">{t('wz.owner.sahibi')}</option>
                  <option value="emlakci">{t('wz.owner.emlakci')}</option>
                  <option value="insaat">{t('wz.owner.insaat')}</option>
                  <option value="banka">{t('wz.owner.banka')}</option>
                </Select>
              </div>
              {formShows(form.type, 'titleDeed') && (
                <div><Label>{t('wz.field.titleDeed')}</Label>
                  <Select value={form.titleDeed} onChange={(e) => set({ titleDeed: e.target.value as typeof form.titleDeed })}>
                    <option value="belirsiz">{t('wz.deed.belirsiz')}</option>
                    <option value="kat_mulkiyeti">{t('wz.deed.kat_mulkiyeti')}</option>
                    <option value="kat_irtifaki">{t('wz.deed.kat_irtifaki')}</option>
                    <option value="arsa_payi">{t('wz.deed.arsa_payi')}</option>
                    <option value="cikti_belgesi">{t('wz.deed.cikti_belgesi')}</option>
                  </Select>
                </div>
              )}
              {formShows(form.type, 'occupancy') && (
                <div><Label>{t('wz.field.occupancy')}</Label>
                  <Select value={form.occupancy} onChange={(e) => set({ occupancy: e.target.value as typeof form.occupancy })}>
                    <option value="bos">{t('wz.occ.bos')}</option>
                    <option value="kiracili">{t('wz.occ.kiracili')}</option>
                    <option value="mulk_sahibi">{t('wz.occ.mulk_sahibi')}</option>
                  </Select>
                </div>
              )}
              {formShows(form.type, 'permits') && (
                <>
                  <div><Label>{t('wz.field.permitNo')}</Label><Input value={form.permitNo} onChange={(e) => set({ permitNo: e.target.value })} maxLength={64} placeholder={t('wz.ph.optional')} /></div>
                  <div><Label>{t('wz.field.parcelNo')}</Label><Input value={form.parcelNo} onChange={(e) => set({ parcelNo: e.target.value })} maxLength={64} placeholder={t('wz.ph.optional')} /></div>
                </>
              )}

              {/* Özellikler — evet/hayır (tipe göre liste değişir) */}
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenitiesFor(form.type).map((o) => {
                  const key = o.k as keyof typeof form;
                  return (
                    <button
                      key={o.k}
                      type="button"
                      onClick={() => set({ [o.k]: !form[key] } as Partial<typeof form>)}
                      aria-pressed={!!form[key]}
                      className={cn('rounded-xl border p-3 text-sm text-left', form[key] ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}
                    >
                      {form[key] ? '✓ ' : ''}{o.l}
                    </button>
                  );
                })}
              </div>
              {form.inSite && (
                <div className="sm:col-span-2"><Label>{t('wz.field.siteName')}</Label>
                  <Input value={form.siteName} onChange={(e) => set({ siteName: e.target.value })} maxLength={120} placeholder={t('wz.ph.siteName')} />
                </div>
              )}

              {!isDaily && (
                <>
                  <div><Label>{t('wz.field.price')}</Label><Input type="number" min={0} value={numVal(form.price)} onChange={(e) => set({ price: numSet(e.target.value) })} placeholder={t('wz.ph.price')} /></div>
                  <div><Label>{t('wz.field.currency')}</Label>
                    <Select value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
                      {['USD', 'EUR', 'TRY', 'AZN'].map((c) => <option key={c}>{c}</option>)}
                    </Select>
                  </div>
                  {form.purpose === 'rent' && (
                    <div><Label>{t('wz.field.deposit')} ({form.currency})</Label><Input type="number" min={0} value={numVal(form.deposit)} onChange={(e) => set({ deposit: numSet(e.target.value) })} placeholder={t('wz.ph.duesEmpty')} /></div>
                  )}
                  {form.purpose === 'sale' && (
                    <button
                      type="button"
                      onClick={() => set({ loanEligible: !form.loanEligible })}
                      aria-pressed={form.loanEligible}
                      className={cn('rounded-xl border p-3 text-sm text-left self-end', form.loanEligible ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}
                    >
                      {form.loanEligible ? '✓ ' : ''}{t('wz.btn.loanEligible')}
                    </button>
                  )}
                  <p className="sm:col-span-2 text-xs font-bold text-[color:var(--fg-muted)] leading-relaxed rounded-lg bg-[color:var(--bg-elev)] border border-[color:var(--border)] p-3">
                    {t('wz.notice.priceWarning')}
                  </p>
                </>
              )}
              {isDaily && (
                <p className="sm:col-span-2 text-xs text-[color:var(--fg-muted)] rounded-lg bg-[color:var(--bg-elev)] border border-[color:var(--border)] p-3">
                  {t('wz.notice.daily')}
                </p>
              )}
              <div className="sm:col-span-2">
                <Label>{t('wz.field.description')}</Label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => set({ description: html })}
                  placeholder={t('wz.ph.description')}
                  invalid={plainTextLen(form.description) > 0 && plainTextLen(form.description) < 20}
                />
                {(() => {
                  const len = plainTextLen(form.description);
                  return (
                    <div
                      className={cn(
                        'mt-1 text-[11px] tabular-nums',
                        len === 0 ? 'text-[color:var(--fg-muted)]' : len < 20 ? 'text-danger font-medium' : 'text-[color:var(--fg-muted)]',
                      )}
                    >
                      {len} / 20
                      {len > 0 && len < 20 && ` · ${t('wz.desc.minChars')}`}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">{t('wz.h.photos')}</h2>
              {/* PF-08: keep the server-side ≥3 requirement strict (image quality
                  is the #1 driver of inquiries), but update the copy so users
                  learn about it on first paint — not after a failed click. */}
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                <strong>{t('wz.photos.help')}</strong> {t('wz.photos.helpRest')}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotos(e.target.files)}
                className="sr-only"
              />

              {photos.length > 1 && (
                <p className="mt-3 text-[11px] text-[color:var(--fg-faint)] inline-flex items-center gap-1">
                  <GripVertical size={12} /> {t('wz.photos.dragHint')}
                </p>
              )}

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((src, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={(e) => { dragIndexRef.current = i; e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverIndex !== i) setDragOverIndex(i); }}
                    onDragLeave={() => { if (dragOverIndex === i) setDragOverIndex(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragIndexRef.current;
                      if (from !== null) movePhoto(from, i);
                      dragIndexRef.current = null;
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
                    className={cn(
                      'group relative aspect-[4/3] rounded-xl overflow-hidden border bg-[color:var(--bg-card-hover)] cursor-grab active:cursor-grabbing transition-shadow',
                      dragOverIndex === i ? 'ring-2 ring-gold-400 ring-offset-1 ring-offset-[color:var(--bg)]' : '',
                      i === 0 ? 'border-gold-400/60' : '',
                    )}
                  >
                    <img src={src} alt={`Foto ${i + 1}`} draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                    <span className="absolute top-1.5 left-1.5 size-6 rounded-md bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                      <GripVertical size={13} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                      aria-label={t('wz.photos.delete')}
                    >
                      <X size={13} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-gold-400 text-navy-900 font-semibold px-1.5 py-0.5 rounded-full">{t('wz.photos.coverBadge')}</span>
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
                    <div className="text-xs font-medium">{t('wz.photos.add')}</div>
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] text-[color:var(--fg-faint)]">
                {photos.length}/12 {t('wz.photos.uploadedSuffix')}
              </p>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold">{t('wz.h.cardCover')}</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                {t('wz.cover.help')}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set({ coverKind: 'photo' })}
                  className={cn('rounded-2xl border p-5 text-left', form.coverKind === 'photo' ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}
                >
                  <ImgIcon size={20} />
                  <div className="mt-2 font-semibold">{t('wz.cover.photoTitle')}</div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-1">{t('wz.cover.photoDesc')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => set({ coverKind: 'video' })}
                  className={cn('rounded-2xl border p-5 text-left', form.coverKind === 'video' ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]')}
                >
                  <Play size={20} />
                  <div className="mt-2 font-semibold">{t('wz.cover.videoTitle')} <Badge variant="premium" className="!text-[10px] ml-1">Premium</Badge></div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-1">{t('wz.cover.videoDesc')}</p>
                </button>
              </div>

              {form.coverKind === 'photo' ? (
                <div className="mt-5">
                  <Label>{t('wz.cover.selectPhoto')}</Label>
                  {photos.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-[color:var(--fg-muted)]">
                      {t('wz.cover.uploadFirst')}
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
                            <span className="absolute top-1.5 right-1.5 rounded-full bg-gold-400 text-navy-900 text-[10px] font-bold px-1.5 py-0.5">{t('wz.cover.coverTag')}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <Label>{t('wz.cover.uploadVideo')}</Label>
                  <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elev)] p-3 text-[11px] text-[color:var(--fg-muted)] leading-relaxed">
                    <strong className="text-[color:var(--fg)]">{t('wz.cover.recommended')}</strong> {t('wz.cover.recommendedDesc')}
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => handleVideo(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {coverVideo ? (
                    <div className="space-y-2">
                      <div className="aspect-video rounded-xl overflow-hidden border bg-black flex items-center justify-center">
                        <video src={coverVideo} muted loop autoPlay playsInline className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()}>
                          <Video size={13} /> {t('wz.cover.change')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCoverVideo('')} className="text-danger hover:bg-danger/10">
                          <X size={13} /> {t('wz.cover.remove')}
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
                      <div className="text-sm font-medium">{t('wz.cover.selectVideo')}</div>
                      <div className="text-[11px] text-[color:var(--fg-faint)]">{t('wz.cover.videoDuration')}</div>
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
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm text-[color:var(--fg-muted)]">{t('wz.nearby.autoIntro')}</p>
                <Button type="button" variant="gold" size="sm" onClick={autoCalcNearby} loading={nearbyLoading}>
                  <SparklesIcon size={14} /> {t('wz.nearby.recalc')}
                </Button>
              </div>
              <NearbyStep value={form.nearby} />
            </div>
          )}

          {step === 8 && (
            <div>
              <h2 className="text-lg font-semibold">{t('wz.h.dailyRent')}</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                {t('wz.daily.desc')}
              </p>

              {(
                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('wz.daily.price')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={numVal(form.dailyRentalPricePerNight)}
                      onChange={(e) => set({ dailyRentalPricePerNight: numSet(e.target.value) })}
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <Label>{t('wz.daily.currency')}</Label>
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
                    <Label>{t('wz.daily.minNights')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={form.dailyRentalMinNights}
                      onChange={(e) => set({ dailyRentalMinNights: Math.max(1, +e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t('wz.daily.notes')}</Label>
                    <Input
                      value={form.dailyRentalNotes}
                      onChange={(e) => set({ dailyRentalNotes: e.target.value })}
                      placeholder={t('wz.daily.notesPh')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div>
              <h2 className="text-lg font-semibold">{t('wz.h.listingOptions')}</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">{t('wz.opt.desc')}</p>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {/* Option 1: IstBaku Onaylı Rozet */}
                <button
                  type="button"
                  onClick={() => set({ tier: form.tier === 'premium' ? 'standart' : 'premium' })}
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
                    <div className="font-bold">{t('wz.opt.badgeTitle')}</div>
                  </div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-2">
                    {t('wz.opt.badgeDesc')}
                  </p>
                  <div className="mt-3 text-gold-300 font-bold">{usdLabel(badgePrice)}</div>
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
                          title: t('wz.toast.privateUnavail'),
                          description: t('wz.toast.privateUnavailDesc'),
                        });
                        return;
                      }
                      // Validate KYC
                      if (user?.kycStatus !== 'approved') {
                        toast({
                          variant: 'error',
                          title: t('wz.toast.kycRequired'),
                          description: t('wz.toast.kycRequiredDesc'),
                        });
                        return;
                      }
                      set({ isPrivate: true });
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
                    <div className="font-bold">{t('wz.opt.privateTitle')}</div>
                  </div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-2">
                    {t('wz.opt.privateDesc')}
                  </p>
                  <div className="mt-3 text-gold-300 font-bold">{usdLabel(privatePrice)}</div>
                </button>
              </div>

              {/* Ücretli eklenti toplamı — seçim varsa ödeme penceresi "Yayınla"da açılır. */}
              {(form.tier === 'premium' || form.isPrivate) ? (
                <div
                  data-testid="extras-total"
                  className="mt-5 rounded-xl bg-gold-500/10 border border-gold-500/30 p-4 text-sm"
                >
                  <div className="flex items-center gap-2 font-semibold text-gold-300">
                    <ShieldCheck size={16} /> {t('wz.opt.payTitle')}
                  </div>
                  <ul className="mt-2 space-y-1 text-[color:var(--fg-muted)]">
                    {form.tier === 'premium' && <li className="flex justify-between"><span>{t('wz.opt.badgeItem')}</span><span>{usdLabel(badgePrice)}</span></li>}
                    {form.isPrivate && <li className="flex justify-between"><span>{t('wz.opt.privateItem')}</span><span>{usdLabel(privatePrice)}</span></li>}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-[color:var(--border)] flex justify-between font-bold">
                    <span>{t('wz.opt.total')}</span>
                    <span className="text-gold-300">{usdLabel((form.tier === 'premium' ? badgePrice : 0) + (form.isPrivate ? privatePrice : 0))}</span>
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--fg-faint)]">{t('wz.opt.payHint')}</p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-[color:var(--bg-elev)] border border-[color:var(--border)] p-4 text-sm flex items-start gap-3">
                  <AlertCircle size={16} className="text-[color:var(--fg-muted)] mt-0.5 shrink-0" />
                  <div className="text-[color:var(--fg-muted)]">
                    {t('wz.opt.none')}
                  </div>
                </div>
              )}
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
            const publishDisabled = publishing;
            return (
              <div className="mt-8 hidden md:flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ArrowLeft size={14} /> {t('wz.back')}
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
                      t('wz.photosShort')
                    ) : (
                      <>{t('wz.next')} <ArrowRight size={14} /></>
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
                    <CheckCircle2 size={14} /> {t('wz.publish')}
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
          <strong className="text-gold-300">{step + 1}</strong> / {STEPS.length} · {t(STEPS[step])}
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
            {t('wz.next')} <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            variant="gold"
            size="lg"
            className="!h-12"
            onClick={publish}
            loading={publishing}
            disabled={publishing}
            data-testid="wizard-publish-mobile"
          >
            <CheckCircle2 size={16} /> {t('wz.publish')}
          </Button>
        )}
      </div>
      <PaymentModal
        open={!!pendingPayment}
        payment={pendingPayment}
        onClose={() => {
          // Ödeme iptal — ilan zaten standart/açık yayında; panele yönlendir.
          const slug = paidContextRef.current?.slug;
          setPendingPayment(null);
          toast({ variant: 'info', title: t('wz.toast.payCancelled'), description: t('wz.toast.payCancelledDesc') });
          setTimeout(() => router.push(slug ? `/property/${slug}` : '/dashboard'), 300);
        }}
        onSuccess={onWizardPaid}
      />
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

function NearbyStep({ value }: { value: NearbyShape }) {
  const { t } = useLang();
  type PoiKey = Exclude<keyof NearbyShape, 'markets'>;
  const FIELDS: { key: PoiKey; label: string }[] = [
    { key: 'metro',   label: t('wz.nearby.metro') },
    { key: 'okul',    label: t('wz.nearby.okul') },
    { key: 'hastane', label: t('wz.nearby.hastane') },
    { key: 'avm',     label: t('wz.nearby.avm') },
    { key: 'park',    label: t('wz.nearby.park') },
    { key: 'eczane',  label: t('wz.nearby.eczane') },
    { key: 'eglence', label: t('wz.nearby.eglence') },
  ];

  // Salt-okunur: mesafeler sunucuda koordinattan hesaplanır (anti-fraud).
  type Entry = { name: string; minutes: number; km: number };
  const rows: { label: string; entry: Entry }[] = [
    ...FIELDS
      .filter((f) => value[f.key]?.name?.trim())
      .map((f) => ({ label: f.label, entry: value[f.key] })),
    ...(value.markets ?? [])
      .filter((m) => m.name?.trim())
      .map((m) => ({ label: t('wz.nearby.market'), entry: m })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('wz.h.nearby')}</h2>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">
          {t('wz.nearby.desc')}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-sm text-[color:var(--fg-muted)]">
          {t('wz.nearby.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {rows.map((r, idx) => (
            <div
              key={`${r.label}-${idx}`}
              className="rounded-xl border p-3 bg-[color:var(--bg-elev)] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-[color:var(--fg-muted)]">{r.label}</div>
                <div className="text-sm font-semibold truncate">{r.entry.name}</div>
              </div>
              <div className="text-xs text-[color:var(--fg-faint)] tabular-nums whitespace-nowrap">
                {r.entry.minutes} dk · {r.entry.km.toFixed(1)} km
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegionStep({ value, onChange }: { value: RegionShape; onChange: (v: RegionShape) => void }) {
  const { t } = useLang();
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
    { key: 'aile', label: t('wz.region.aile'), icon: Users, color: '#CAAE99' },
    { key: 'memur', label: t('wz.region.memur'), icon: Briefcase, color: '#6366f1' },
    { key: 'ogrenci', label: t('wz.region.ogrenci'), icon: GraduationCap, color: '#10b981' },
    { key: 'yabanci', label: t('wz.region.yabanci'), icon: Globe, color: '#e3d6c8' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('wz.h.regionProfile')}</h2>
      <p className="text-sm text-[color:var(--fg-muted)] mt-1">
        {t('wz.region.desc')}
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
            <span className="text-[color:var(--fg-muted)]">{t('wz.region.diger')}</span>
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

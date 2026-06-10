import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, BedDouble, Bath, Maximize2, Building2,
  Eye, Sparkles, Car, Trees, Waves, Dumbbell, Hash,
} from 'lucide-react';
import { PropertyHeaderActions } from '@/components/listings/PropertyHeaderActions';
import { ApprovedBadge } from '@/components/listings/ApprovedBadge';
import { getListingBySlug, getListingByNumber, getSimilarListings, getAgentById, getAllSlugs } from '@/lib/db-queries';
import { formatListingNumber, parseListingNumber } from '@/lib/listing-number';
import { sanitizeHtml } from '@/lib/sanitize';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PropertyGallery } from '@/components/listings/PropertyGallery';
import { InvestmentScoreCard } from '@/components/listings/InvestmentScoreCard';
import { PropertyDetailActions } from '@/components/listings/PropertyDetailActions';
import { DailyBookingCard } from '@/components/listings/DailyBookingCard';
import { getOccupiedRanges } from '@/lib/daily-booking-actions';
import { PriceCard } from '@/components/listings/PriceCard';
import { QuickMortgage } from '@/components/listings/QuickMortgage';
import { RegionProfileCard } from '@/components/listings/RegionProfile';
import { NearbyPOIList } from '@/components/listings/NearbyPOI';
import { MapView } from '@/components/listings/MapView';
import { ListingCard } from '@/components/listings/ListingCard';
import { OwnerActionBarWrapper } from '@/components/listings/OwnerActionBarWrapper';
import { getAllPrices } from '@/lib/pricing';
import { ViewTracker } from '@/components/listings/ViewTracker';
import { timeAgo } from '@/lib/utils';
import { showsField } from '@/lib/labels';
import { FloorText, HeatingText } from '@/components/i18n/Fmt';
import { T } from '@/components/i18n/T';
import { E } from '@/components/i18n/E';

export async function generateStaticParams() {
  try {
    const slugs = await getAllSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return []; // DB yoksa boş — runtime'da on-demand SSR
  }
}

// MH-19 — public detail page; ISR with 1h revalidate.
export const revalidate = 3600;

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // URL segmenti sadece rakamsa public ilan numarası (/property/00012), aksi halde slug.
  const num = parseListingNumber(slug);
  const property = num
    ? await getListingByNumber(num, { requireApproved: false })
    : await getListingBySlug(slug, { requireApproved: false });
  if (!property) notFound();
  // MH-20 — fan out independent queries; agent lookup depends on property.agentId
  // but does not depend on `similar`, so both can run in parallel.
  const [agent, similar, occupiedRanges, prices] = await Promise.all([
    property.agentId ? getAgentById(property.agentId) : Promise.resolve(null),
    getSimilarListings(property, 3),
    property.dailyRentalEnabled ? getOccupiedRanges(property.id) : Promise.resolve([]),
    getAllPrices(),
  ]);

  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-10 pb-44 md:pb-10"
      style={{ scrollPaddingBottom: '96px' }}
    >
      <ViewTracker id={property.id} />
      {/* PP-04: pb-44 (was pb-32) gives the mobile bottom-bar + global bottom-nav +
          iOS safe-area enough headroom so the agent's "Mesaj gönder" CTA at the end
          of the page is never visually clipped behind the sticky CTA. */}

      <nav className="text-xs text-[color:var(--fg-muted)] mb-4 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-gold-300"><T k="common.home" /></Link>
        <span>/</span>
        <Link href="/listings" className="hover:text-gold-300"><T k="nav.listings" /></Link>
        <span>/</span>
        <Link href={`/listings?q=${encodeURIComponent(property.city)}`} className="hover:text-gold-300">{property.city}</Link>
        <span>/</span>
        <span className="text-[color:var(--fg)] line-clamp-1">{property.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline"><E g="purpose" v={property.purpose} /></Badge>
            <Badge variant="outline"><E g="type" v={property.type} /></Badge>
            {(property.istbakuApproved || property.tier === 'premium') && <ApprovedBadge />}
            {property.has360 && <Badge variant="navy"><T k="property.tour360" /></Badge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-3xl">{property.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[color:var(--fg-muted)] flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-2 py-0.5 font-mono font-semibold tabular-nums tracking-wide text-[color:var(--fg)]" title="İlan numarası">
              <Hash size={12} className="text-gold-300" />{formatListingNumber(property.listingNumber)}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {property.city} / {property.district}{property.neighborhood ? ` / ${property.neighborhood}` : ''}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Eye size={13} /> {property.views.toLocaleString('tr-TR')} <T k="property.views" /></span>
            <span>·</span>
            <span>{timeAgo(property.publishedAt)}</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <PropertyHeaderActions propertyId={property.id} propertyTitle={property.title} />
        </div>
      </div>

      <div className="mt-6">
        <PropertyGallery images={property.images} has360={property.has360} video={property.video} listingNumber={formatListingNumber(property.listingNumber)} approved={property.istbakuApproved || property.tier === 'premium'} watermarked={property.watermarked} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Satış fiyatı kartı: kur + m² + yield */}
          <PriceCard property={property} />

          {/* Hızlı özet metrikler */}
          <Card>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  showsField(property.type, 'rooms') && { i: BedDouble, l: <T k="property.rooms" />, v: property.rooms },
                  showsField(property.type, 'bathrooms') && { i: Bath, l: <T k="property.bathrooms" />, v: property.bathrooms },
                  { i: Maximize2, l: <T k="property.netArea" />, v: `${property.area.net} m²` },
                  showsField(property.type, 'buildingAge') && { i: Building2, l: <T k="property.buildingAge" />, v: property.buildingAge === 0 ? <T k="property.brandNew" /> : property.buildingAge },
                ].filter(Boolean).map((m, mi) => {
                  const M = m as { i: typeof BedDouble; l: React.ReactNode; v: React.ReactNode };
                  return (
                    <div key={mi} className="rounded-xl bg-[color:var(--bg-elev)] border p-3">
                      <M.i size={14} className="text-gold-300" />
                      <div className="text-[10px] uppercase mt-1 text-[color:var(--fg-muted)]">{M.l}</div>
                      <div className="font-bold mt-0.5">{M.v}</div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Açıklama */}
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3"><T k="property.description" /></h3>
              <div
                className="tiptap-content text-[color:var(--fg-muted)] leading-relaxed text-pretty"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(property.description) }}
              />
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[color:var(--fg-faint)]">
                <Sparkles size={12} className="text-gold-300" /> <T k="property.aiNote" />
              </div>
            </CardBody>
          </Card>

          {/* Bina ve daire detayları (arsa hariç — arsa için ayrı kart aşağıda) */}
          {property.type !== 'arsa' && (
          <Card>
            <CardBody>
              <h3 className="font-bold mb-4"><T k="property.details" /></h3>
              {/* Sıralama site sahibinin talebine göre düzenlendi (Madde 14).
                  Listede olmayan alanlar (depozito, konut tipi, cephe, yapı durumu,
                  izin/parsel no) silinmeyip sona alındı. */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm font-bold">
                {/* 1-2 alan */}
                <DetailRow l={<T k="property.grossArea" />} v={`${property.area.gross} m²`} />
                <DetailRow l={<T k="property.netArea" />} v={`${property.area.net} m²`} />
                {/* 3-4 kat */}
                {showsField(property.type, 'floor') && (
                  <>
                    <DetailRow l={<T k="property.totalFloors" />} v={property.totalFloors} />
                    <DetailRow l={<T k="property.floor" />} v={<FloorText n={property.floor} />} />
                  </>
                )}
                {/* 5 ısıtma */}
                {showsField(property.type, 'buildingAge') && (
                  <DetailRow l={<T k="property.heating" />} v={<HeatingText v={property.heating} />} />
                )}
                {/* 6 krediye uygunluk */}
                {property.purpose === 'sale' && property.loanEligible && (
                  <DetailRow l={<T k="property.loanEligible" />} v={<T k="common.yes" />} />
                )}
                {/* 7 eşyalı */}
                {showsField(property.type, 'furnished') && (
                  <DetailRow l={<T k="property.furnished" />} v={<T k={property.furnished ? 'common.yes' : 'common.no'} />} />
                )}
                {/* 8 balkon */}
                <DetailRow l={<T k="property.balcony" />} v={<T k={property.balcony ? 'common.exists' : 'common.none'} />} />
                {/* 9 durum */}
                <DetailRow l={<T k="property.status" />} v={<E g="status" v={property.status} />} />
                {/* 10 asansör */}
                {showsField(property.type, 'elevator') && (
                  <DetailRow l={<T k="property.elevator" />} v={<T k={property.elevator ? 'common.exists' : 'common.none'} />} />
                )}
                {/* 11 sahip */}
                <DetailRow l={<T k="property.owner" />} v={<E g="ownerType" v={property.ownerType} />} />
                {/* 12 zemin etüdü */}
                <DetailRow l={<T k="property.groundSurvey" />} v={<T k={property.groundSurvey ? 'common.exists' : 'common.none'} />} />
                {/* 13 enerji kimlik belgesi */}
                {property.energyClass && property.energyClass !== 'belirsiz' && (
                  <DetailRow l={<T k="property.energyClass" />} v={<E g="energyClass" v={property.energyClass} />} />
                )}
                {/* 14 site içi */}
                <DetailRow l={<T k="property.inSite" />} v={<T k={property.inSite ? 'common.yes' : 'common.no'} />} />
                {/* 15 site ismi */}
                {property.inSite && property.siteName && (
                  <DetailRow l={<T k="property.siteName" />} v={property.siteName} />
                )}
                {/* 16 aidat */}
                {property.dues != null && property.dues > 0 && (
                  <DetailRow l={<T k="property.dues" />} v={`${property.dues.toLocaleString('tr-TR')} ₺`} />
                )}
                {/* 17 otopark */}
                <DetailRow l={<T k="property.parking" />} v={<E g="parking" v={property.parking} />} />
                {/* 18 takas */}
                <DetailRow l={<T k="property.swappable" />} v={property.swappable ? <T k="property.swappableYes" /> : <T k="common.no" />} />
                {/* 19 tapu */}
                <DetailRow l={<T k="property.titleDeed" />} v={<E g="titleDeed" v={property.titleDeed} />} />
                {/* 20 yapı tipi */}
                {property.structureType && property.structureType !== 'belirtilmemis' && (
                  <DetailRow l={<T k="property.structureType" />} v={<E g="structureType" v={property.structureType} />} />
                )}

                {/* — Listede olmayan ama korunan alanlar (sona alındı) — */}
                {property.deposit != null && property.deposit > 0 && (
                  <DetailRow l={<T k="property.deposit" />} v={`${property.deposit.toLocaleString('tr-TR')} ${property.currency}`} />
                )}
                {property.housingType && property.housingType !== 'belirtilmemis' && (
                  <DetailRow l={<T k="property.housingType" />} v={<E g="housingType" v={property.housingType} />} />
                )}
                {property.facade && property.facade !== 'belirtilmemis' && (
                  <DetailRow l={<T k="property.facade" />} v={<E g="facade" v={property.facade} />} />
                )}
                {property.buildingStatus && property.buildingStatus !== 'belirtilmemis' && (
                  <DetailRow l={<T k="property.buildingStatus" />} v={<E g="buildingStatus" v={property.buildingStatus} />} />
                )}
                {property.permitNo && <DetailRow l={<T k="property.permitNo" />} v={property.permitNo} />}
                {property.parcelNo && <DetailRow l={<T k="property.parcelNo" />} v={property.parcelNo} />}
              </div>

              <div className="mt-5 pt-5 border-t flex flex-wrap gap-2">
                {property.pool && <Feature i={Waves} l={<T k="property.pool" />} />}
                {property.gym && <Feature i={Dumbbell} l={<T k="property.gym" />} />}
                {property.sauna && <Feature i={Trees} l={<T k="property.sauna" />} />}
                {property.parking !== 'yok' && <Feature i={Car} l={<><E g="parking" v={property.parking} /> <T k="property.parking" /></>} />}
              </div>
            </CardBody>
          </Card>
          )}

          {/* Arsa detayları (sadece type='arsa') — Madde 15 */}
          {property.type === 'arsa' && (
          <Card>
            <CardBody>
              <h3 className="font-bold mb-4"><T k="property.landDetails" /></h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm font-bold">
                {property.imarDurumu && <DetailRow l={<T k="property.imarDurumu" />} v={property.imarDurumu} />}
                <DetailRow l={<T k="property.titleDeed" />} v={<E g="titleDeed" v={property.titleDeed} />} />
                <DetailRow l={<T k="property.owner" />} v={<E g="ownerType" v={property.ownerType} />} />
                <DetailRow l={<T k="property.swappable" />} v={property.swappable ? <T k="property.swappableYes" /> : <T k="common.no" />} />
                {property.paftaNo && <DetailRow l={<T k="property.paftaNo" />} v={property.paftaNo} />}
                {property.kaks != null && <DetailRow l={<T k="property.kaks" />} v={property.kaks} />}
                {property.gabari && <DetailRow l={<T k="property.gabari" />} v={property.gabari} />}
                {property.purpose === 'sale' && property.loanEligible && (
                  <DetailRow l={<T k="property.loanEligible" />} v={<T k="common.yes" />} />
                )}
                <DetailRow l={<T k="property.grossArea" />} v={`${property.area.gross} m²`} />
                <DetailRow l={<T k="property.pricePerSqm" />} v={`${Math.round(property.price / Math.max(1, property.area.gross)).toLocaleString('tr-TR')} ${property.currency}/m²`} />
                {property.adaNo && <DetailRow l={<T k="property.adaNo" />} v={property.adaNo} />}
                {property.parcelNo && <DetailRow l={<T k="property.parcelNo" />} v={property.parcelNo} />}
              </div>
            </CardBody>
          </Card>
          )}

          {/* Bina detayları (sadece type='bina') — Madde 3 */}
          {property.type === 'bina' && (property.totalUnits != null || property.imarDurumu) && (
          <Card>
            <CardBody>
              <h3 className="font-bold mb-4"><T k="wz.building.title" /></h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm font-bold">
                {property.totalUnits != null && <DetailRow l={<T k="wz.field.totalUnits" />} v={property.totalUnits} />}
                {property.imarDurumu && <DetailRow l={<T k="wz.field.buildingUsage" />} v={property.imarDurumu} />}
                <DetailRow l={<T k="property.grossArea" />} v={`${property.area.gross} m²`} />
              </div>
            </CardBody>
          </Card>
          )}

          {/* Konum + harita + POI */}
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><MapPin size={15} className="text-gold-300" /> <T k="property.location" /></h3>
              <div className="w-full h-[300px] sm:h-[420px] rounded-2xl overflow-hidden border">
                <MapView properties={[property]} />
              </div>
              <p className="mt-3 text-xs text-[color:var(--fg-muted)]">
                {property.address}, {property.district}, {property.city}
              </p>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-[color:var(--fg-muted)] mb-2"><T k="property.nearby" /></div>
                <NearbyPOIList nearby={property.nearby} />
              </div>
            </CardBody>
          </Card>

          {/* Bölge profil analizi */}
          <RegionProfileCard profile={property.regionProfile} district={property.district} city={property.city} />

          {/* Hızlı kredi — yalnızca satılık ilanlarda (kiralık/günlük kiralıkta ipotek anlamsız) */}
          {property.purpose === 'sale' && <QuickMortgage property={property} />}

          {/* Benzer ilanlar */}
          {similar.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4"><T k="property.similar" /></h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similar.map((p) => <ListingCard key={p.id} property={p} compact />)}
              </div>
            </div>
          )}
        </div>

        {/* Sağ kolon: skor + agent kartı (sticky). */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-0.5">
          {property.type !== 'arsa' && property.type !== 'proje' && <InvestmentScoreCard property={property} />}
          {property.agentId && (
            <OwnerActionBarWrapper
              listingId={property.id}
              agentId={property.agentId}
              currentTier={property.tier}
              isApproved={property.istbakuApproved}
              isPrivate={property.isPrivate}
              price={property.price}
              prices={{ renewal: prices.date_renewal, badge: prices.istbaku_badge }}
            />
          )}
          <PropertyDetailActions property={property} agent={agent ?? undefined} />
          {property.purpose === 'daily_rent' && property.dailyRentalEnabled && property.dailyRentalPricePerNight && (
            <DailyBookingCard
              listingId={property.id}
              pricePerNight={property.dailyRentalPricePerNight}
              currency={property.dailyRentalCurrency ?? property.currency}
              minNights={property.dailyRentalMinNights ?? 1}
              notes={property.dailyRentalNotes}
              occupied={occupiedRanges}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ l, v }: { l: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed py-1">
      <span className="text-[color:var(--fg-muted)] text-xs font-bold">{l}</span>
      <span className="font-bold text-sm">{v}</span>
    </div>
  );
}

function Feature({ i: I, l }: { i: typeof MapPin; l: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-[color:var(--bg-elev)] px-3 py-1.5 text-xs font-bold">
      <I size={13} className="text-gold-300" /> {l}
    </span>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, BedDouble, Bath, Maximize2, Building2, ShieldCheck,
  Eye, Sparkles, Car, Trees, Waves, Dumbbell,
} from 'lucide-react';
import { PropertyHeaderActions } from '@/components/listings/PropertyHeaderActions';
import { getListingBySlug, getSimilarListings, getAgentById, getAllSlugs } from '@/lib/db-queries';
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
import { timeAgo } from '@/lib/utils';
import {
  OWNER_TYPE_LABEL, TITLE_DEED_LABEL, STATUS_LABEL, PARKING_LABEL,
  PROPERTY_TYPE_LABEL, PURPOSE_LABEL, formatFloor, showsField, HEATING_LABEL,
} from '@/lib/labels';

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
  const property = await getListingBySlug(slug, { requireApproved: false });
  if (!property) notFound();
  // MH-20 — fan out independent queries; agent lookup depends on property.agentId
  // but does not depend on `similar`, so both can run in parallel.
  const [agent, similar, occupiedRanges] = await Promise.all([
    property.agentId ? getAgentById(property.agentId) : Promise.resolve(null),
    getSimilarListings(property, 3),
    property.dailyRentalEnabled ? getOccupiedRanges(property.id) : Promise.resolve([]),
  ]);

  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-10 pb-44 md:pb-10"
      style={{ scrollPaddingBottom: '96px' }}
    >
      {/* PP-04: pb-44 (was pb-32) gives the mobile bottom-bar + global bottom-nav +
          iOS safe-area enough headroom so the agent's "Mesaj gönder" CTA at the end
          of the page is never visually clipped behind the sticky CTA. */}
      <nav className="text-xs text-[color:var(--fg-muted)] mb-4 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-gold-300">Ana Sayfa</Link>
        <span>/</span>
        <Link href="/listings" className="hover:text-gold-300">İlanlar</Link>
        <span>/</span>
        <Link href={`/listings?q=${encodeURIComponent(property.city)}`} className="hover:text-gold-300">{property.city}</Link>
        <span>/</span>
        <span className="text-[color:var(--fg)] line-clamp-1">{property.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline">{PURPOSE_LABEL[property.purpose]}</Badge>
            <Badge variant="outline">{PROPERTY_TYPE_LABEL[property.type]}</Badge>
            {property.istbakuApproved && (
              <Badge variant="success"><ShieldCheck size={11} /> ISTBAKU Onaylı (Seviye {property.approvalLevel})</Badge>
            )}
            {property.tier === 'premium' && <Badge variant="premium">★ Premium</Badge>}
            {property.tier === 'guclu' && <Badge variant="ai">Güçlü</Badge>}
            {property.has360 && <Badge variant="navy">360° Tur</Badge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-3xl">{property.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[color:var(--fg-muted)] flex-wrap">
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {property.city} / {property.district}{property.neighborhood ? ` / ${property.neighborhood}` : ''}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Eye size={13} /> {property.views.toLocaleString('tr-TR')} görüntülenme</span>
            <span>·</span>
            <span>{timeAgo(property.publishedAt)}</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <PropertyHeaderActions propertyId={property.id} propertyTitle={property.title} />
        </div>
      </div>

      <div className="mt-6">
        <PropertyGallery images={property.images} has360={property.has360} video={property.video} />
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
                  showsField(property.type, 'rooms') && { i: BedDouble, l: 'Oda', v: property.rooms },
                  showsField(property.type, 'bathrooms') && { i: Bath, l: 'Banyo', v: property.bathrooms },
                  { i: Maximize2, l: 'Net m²', v: `${property.area.net} m²` },
                  showsField(property.type, 'buildingAge') && { i: Building2, l: 'Bina Yaşı', v: property.buildingAge === 0 ? 'Sıfır' : property.buildingAge },
                ].filter(Boolean).map((m) => {
                  const M = m as { i: typeof BedDouble; l: string; v: React.ReactNode };
                  return (
                    <div key={M.l} className="rounded-xl bg-[color:var(--bg-elev)] border p-3">
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
              <h3 className="font-semibold mb-3">Açıklama</h3>
              <p className="text-[color:var(--fg-muted)] leading-relaxed text-pretty whitespace-pre-line">{property.description}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[color:var(--fg-faint)]">
                <Sparkles size={12} className="text-gold-300" /> Bu açıklama ISTBAKU AI ile gözden geçirilmiştir.
              </div>
            </CardBody>
          </Card>

          {/* Bina ve daire detayları */}
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-4">Bina ve Daire Detayları</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <DetailRow l="Brüt m²" v={`${property.area.gross} m²`} />
                <DetailRow l="Net m²" v={`${property.area.net} m²`} />
                {showsField(property.type, 'floor') && (
                  <>
                    <DetailRow l="Bulunduğu kat" v={formatFloor(property.floor)} />
                    <DetailRow l="Kat sayısı" v={property.totalFloors} />
                  </>
                )}
                {showsField(property.type, 'buildingAge') && (
                  <DetailRow l="Isıtma" v={HEATING_LABEL(property.heating)} />
                )}
                <DetailRow l="Otopark" v={PARKING_LABEL[property.parking]} />
                {showsField(property.type, 'furnished') && (
                  <DetailRow l="Eşyalı" v={property.furnished ? 'Evet' : 'Hayır'} />
                )}
                {showsField(property.type, 'elevator') && (
                  <DetailRow l="Asansör" v={property.elevator ? 'Var' : 'Yok'} />
                )}
                <DetailRow l="Balkon" v={property.balcony ? 'Var' : 'Yok'} />
                <DetailRow l="Site içi" v={property.inSite ? 'Evet' : 'Hayır'} />
                <DetailRow l="Tapu" v={TITLE_DEED_LABEL[property.titleDeed] ?? property.titleDeed} />
                <DetailRow l="Durum" v={STATUS_LABEL[property.status] ?? property.status} />
                <DetailRow l="Sahip" v={OWNER_TYPE_LABEL[property.ownerType] ?? property.ownerType} />
                <DetailRow l="Takas" v={property.swappable ? 'Düşünülür' : 'Hayır'} />
              </div>

              <div className="mt-5 pt-5 border-t flex flex-wrap gap-2">
                {property.pool && <Feature i={Waves} l="Havuz" />}
                {property.gym && <Feature i={Dumbbell} l="Spor salonu" />}
                {property.sauna && <Feature i={Trees} l="Sauna" />}
                {property.parking !== 'yok' && <Feature i={Car} l={`${PARKING_LABEL[property.parking]} Otopark`} />}
              </div>
            </CardBody>
          </Card>

          {/* Konum + harita + POI */}
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><MapPin size={15} className="text-gold-300" /> Konum</h3>
              <div className="w-full h-[420px] rounded-2xl overflow-hidden border">
                <MapView properties={[property]} />
              </div>
              <p className="mt-3 text-xs text-[color:var(--fg-muted)]">
                {property.address}, {property.district}, {property.city}
              </p>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-[color:var(--fg-muted)] mb-2">Yakın çevre</div>
                <NearbyPOIList nearby={property.nearby} />
              </div>
            </CardBody>
          </Card>

          {/* Bölge profil analizi */}
          <RegionProfileCard profile={property.regionProfile} district={property.district} city={property.city} />

          {/* Hızlı kredi — sol kolon en altta */}
          <QuickMortgage property={property} />

          {/* Benzer ilanlar */}
          {similar.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Benzer İlanlar</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similar.map((p) => <ListingCard key={p.id} property={p} compact />)}
              </div>
            </div>
          )}
        </div>

        {/* Sağ kolon: skor + agent kartı (sticky). */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-0.5">
          <InvestmentScoreCard property={property} />
          {property.agentId && (
            <OwnerActionBarWrapper
              listingId={property.id}
              agentId={property.agentId}
              currentTier={property.tier}
              isApproved={property.istbakuApproved}
              isPrivate={property.isPrivate}
              price={property.price}
            />
          )}
          <PropertyDetailActions property={property} agent={agent ?? undefined} />
          {property.dailyRentalEnabled && property.dailyRentalPricePerNight && (
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

function DetailRow({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed py-1">
      <span className="text-[color:var(--fg-muted)] text-xs">{l}</span>
      <span className="font-medium text-sm">{v}</span>
    </div>
  );
}

function Feature({ i: I, l }: { i: typeof MapPin; l: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-[color:var(--bg-elev)] px-3 py-1.5 text-xs">
      <I size={13} className="text-gold-300" /> {l}
    </span>
  );
}

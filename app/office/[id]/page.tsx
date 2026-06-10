import { notFound } from 'next/navigation';
import { Star, BadgeCheck, MapPin, Building2 } from 'lucide-react';
import { getOfficeProfile } from '@/lib/office-public-actions';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ListingCard } from '@/components/listings/ListingCard';
import { OfficeReviewForm } from './OfficeReviewForm';
import { T } from '@/components/i18n/T';
import { timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={value >= n ? 'text-gold-300' : 'text-[color:var(--border-strong)]'}
          fill={value >= n ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

export default async function OfficePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getOfficeProfile(id);
  if (!profile) notFound();

  const { agent, listings, reviews, ratingAvg, reviewCount, coverPhoto } = profile;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Tur6 #4d: Facebook tarzı kapak fotoğrafı */}
      <div className="relative h-36 sm:h-52 rounded-2xl overflow-hidden border bg-gradient-to-br from-navy-700 to-navy-900">
        {coverPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      {/* Ofis başlığı — avatar kapağın üstüne taşan dairesel foto */}
      <Card className="-mt-12 relative z-10">
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatar} alt="" width={96} height={96} className="size-24 -mt-12 sm:-mt-16 rounded-full object-cover bg-[color:var(--bg-elev)] border-4 border-[color:var(--bg-card)] shadow-lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{agent.agency || agent.name}</h1>
              {agent.verified && <BadgeCheck size={18} className="text-gold-300 shrink-0" />}
              <Badge variant="navy" className="gap-1"><Building2 size={11} /> {agent.isOffice ? <T k="office.badge" /> : <T k="office.agentBadge" />}</Badge>
            </div>
            <div className="mt-1 text-sm text-[color:var(--fg-muted)]">{agent.name}</div>
            <div className="mt-2 flex items-center gap-4 text-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Stars value={Math.round(ratingAvg)} /> <strong>{ratingAvg.toFixed(1)}</strong>
                <a href="#reviews" className="text-[color:var(--fg-muted)] hover:text-gold-300 underline-offset-2 hover:underline">({reviewCount} <T k="office.reviews" />)</a>
              </span>
              <span className="text-[color:var(--fg-muted)]">{listings.length} <T k="office.listings" /></span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Hakkımızda */}
      {agent.about && (
        <Card>
          <CardBody>
            <h2 className="font-bold mb-2"><T k="office.about" /></h2>
            <p className="text-[color:var(--fg-muted)] leading-relaxed whitespace-pre-line">{agent.about}</p>
          </CardBody>
        </Card>
      )}

      {/* Ofis fotoğrafları */}
      {agent.photos && agent.photos.length > 0 && (
        <div>
          <h2 className="font-bold mb-3"><T k="office.photos" /></h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {agent.photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-[4/3] w-full object-cover rounded-xl border" />
            ))}
          </div>
        </div>
      )}

      {/* İlanlar */}
      <div>
        <h2 className="font-bold mb-3 flex items-center gap-2"><MapPin size={18} className="text-gold-300" /> <T k="office.allListings" /></h2>
        {listings.length === 0 ? (
          <Card><CardBody className="text-center py-10 text-[color:var(--fg-muted)]"><T k="office.noListings" /></CardBody></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((p) => <ListingCard key={p.id} property={p} />)}
          </div>
        )}
      </div>

      {/* Yorumlar + puanlar */}
      <div id="reviews" className="grid lg:grid-cols-3 gap-6 scroll-mt-24">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Star size={18} className="text-gold-300" /> <T k="office.reviewsTitle" /></h2>
          {reviews.length === 0 ? (
            <Card><CardBody className="text-center py-8 text-[color:var(--fg-muted)]"><T k="office.noReviews" /></CardBody></Card>
          ) : (
            reviews.map((r) => (
              <Card key={r.id}>
                <CardBody className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.authorAvatar && <img src={r.authorAvatar} alt="" className="size-7 rounded-full object-cover" />}
                      <span className="font-medium text-sm">{r.authorName}</span>
                    </div>
                    <span className="text-xs text-[color:var(--fg-faint)]">{timeAgo(r.createdAt)}</span>
                  </div>
                  <Stars value={r.rating} size={13} />
                  {r.text && <p className="text-sm text-[color:var(--fg-muted)] leading-relaxed">{r.text}</p>}
                </CardBody>
              </Card>
            ))
          )}
        </div>
        <div>
          <OfficeReviewForm agentUserId={agent.id} />
        </div>
      </div>
    </div>
  );
}

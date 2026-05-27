'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Heart, GitCompare, Bell, Sparkles, Search,
  Eye, MapPin, ArrowUpRight, BadgeCheck, Pencil, Trash2,
  Zap, Star, AlertTriangle, ExternalLink, CalendarDays, Check, X,
  CreditCard,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ListingCard } from '@/components/listings/ListingCard';
import { ScoreRing } from '@/components/listings/ScoreRing';
import { useNotifications } from '@/lib/notifications-store';
import { signOutAction, type PublicUser } from '@/lib/auth-actions';
import { upgradeTierAction, deleteListingAction, deleteSavedSearchAction } from '@/lib/listing-actions';
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/notification-actions';
import { useCompare } from '@/lib/compare-store';
import { useFavorites } from '@/lib/favorites-store';
import { formatPrice } from '@/lib/currency';
import { timeAgo, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { Property } from '@/lib/types';

const TABS = [
  { k: 'overview', l: 'Genel Bakış', i: Home },
  { k: 'listings', l: 'İlanlarım', i: Home },
  { k: 'daily-bookings', l: 'Günlük Rezervasyonlar', i: CalendarDays },
  { k: 'favorites', l: 'Favoriler', i: Heart },
  { k: 'compare', l: 'Karşılaştır', i: GitCompare },
  { k: 'matches', l: 'AI Eşleşmeler', i: Sparkles },
  { k: 'searches', l: 'Kayıtlı Aramalar', i: Search },
  { k: 'payments', l: 'Ödemeler', i: CreditCard },
  { k: 'notifications', l: 'Bildirimler', i: Bell },
] as const;
type Tab = typeof TABS[number]['k'];
const VALID_TABS = new Set(TABS.map((t) => t.k));

interface SavedSearchUI { id: string; name: string; createdAt: string; newMatches: number }
interface NotificationUI { id: string; type: string; title: string; body: string; link: string | null; read: boolean; createdAt: string }
export interface DailyBookingUI {
  id: string;
  listingId: string;
  listingTitle?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  currency: 'USD' | 'EUR' | 'TRY' | 'AZN';
  guestCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  notes: string | null;
  ownerResponseNote: string | null;
  createdAt: string;
}

interface PaymentUI {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Props {
  initialUser: PublicUser;
  myListings: Property[];
  favorites: Property[];
  savedSearches: SavedSearchUI[];
  notifications: NotificationUI[];
  dailyBookings: DailyBookingUI[];
  payments: PaymentUI[];
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  tier_upgrade: 'İlan Yükseltme',
  premium_membership: 'Premium Üyelik',
  report_purchase: 'Rapor Satışı',
  partner_commission: 'Partner Komisyonu',
  date_renewal: 'Tarih Yenileme',
  istbaku_approved: 'IstBaku Onaylı',
};
const PAYMENT_STATUS_LABELS: Record<string, { l: string; v: 'success' | 'gold' | 'danger' | 'default' }> = {
  paid: { l: 'Ödendi', v: 'success' },
  pending: { l: 'Beklemede', v: 'gold' },
  failed: { l: 'Başarısız', v: 'danger' },
  refunded: { l: 'İade', v: 'default' },
};

export function DashboardClient({ initialUser, myListings, favorites, savedSearches, notifications, dailyBookings, payments }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = sp.get('tab');
  const initial: Tab = raw && VALID_TABS.has(raw as Tab) ? (raw as Tab) : 'overview';
  const [tab, setTabState] = React.useState<Tab>(initial);
  const setTab = React.useCallback((t: Tab) => {
    setTabState(t);
    const params = new URLSearchParams(sp.toString());
    if (t === 'overview') params.delete('tab'); else params.set('tab', t);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, sp]);
  const { unread } = useNotifications();
  // Hydration: badge sadece client tarafında mount sonrası render olsun
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const showUnread = mounted && unread > 0;
  const user = initialUser;
  const signOut = async () => {
    await signOutAction();
    window.location.href = '/';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <img src={user.avatar ?? ''} alt={user.name} className="size-12 rounded-2xl object-cover bg-gold-400/20" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Hoş geldin, {user.name.split(' ')[0]}</h1>
            <p className="text-xs text-[color:var(--fg-muted)] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="truncate max-w-[180px]">{user.email}</span>
              {user.premium && <Badge variant="premium" className="!text-[10px]"><BadgeCheck size={11} /> Premium</Badge>}
              {user.kycStatus === 'approved' && <Badge variant="success" className="!text-[10px]">KYC ✓</Badge>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/new-listing"><Button variant="gold" size="md">+ İlan Ekle</Button></Link>
          <Button variant="ghost" size="md" onClick={signOut} className="text-danger hover:bg-danger/10">Çıkış</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="lg:sticky lg:top-20 lg:h-fit space-y-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="flex lg:flex-col gap-1 lg:gap-1 min-w-max lg:min-w-0">
            {TABS.map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm border transition-colors whitespace-nowrap',
                  tab === t.k ? 'bg-gold-400/15 border-gold-400/40 text-gold-300' : 'border-transparent hover:bg-[color:var(--bg-card-hover)]',
                )}
              >
                <span className="inline-flex items-center gap-2.5"><t.i size={15} /> {t.l}</span>
                {t.k === 'notifications' && showUnread && (
                  <span className="text-[10px] rounded-full bg-gold-400 text-navy-900 px-1.5">{unread}</span>
                )}
                {t.k === 'favorites' && favorites.length > 0 && (
                  <span className="text-[10px] text-[color:var(--fg-muted)]">{favorites.length}</span>
                )}
                {t.k === 'listings' && myListings.length > 0 && (
                  <span className="text-[10px] text-[color:var(--fg-muted)]">{myListings.length}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main>
          {tab === 'overview' && <Overview user={user} myListings={myListings} favorites={favorites} notifications={notifications} />}
          {tab === 'listings' && <MyListings listings={myListings} />}
          {tab === 'daily-bookings' && <DailyBookingsTab initial={dailyBookings} />}
          {tab === 'favorites' && <Favorites favorites={favorites} />}
          {tab === 'compare' && <CompareTab />}
          {tab === 'matches' && <Matches />}
          {tab === 'searches' && <SavedSearches initial={savedSearches} />}
          {tab === 'payments' && <PaymentsTab payments={payments} />}
          {tab === 'notifications' && <Notifications initial={notifications} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ user, myListings, favorites, notifications }: { user: PublicUser; myListings: Property[]; favorites: Property[]; notifications: NotificationUI[] }) {
  const totalViews = myListings.reduce((a, p) => a + p.views, 0);
  const stats = [
    { l: 'Aktif İlanlarım', v: String(myListings.length), i: Home, c: 'text-gold-300' },
    { l: 'Favorilerim', v: String(favorites.length), i: Heart, c: 'text-danger' },
    { l: 'Görüntülenme', v: totalViews.toLocaleString('tr-TR'), i: Eye, c: 'text-navy-300' },
    { l: 'KYC Durumu', v: user.kycStatus === 'approved' ? '✓ Onaylı' : user.kycStatus === 'pending' ? 'Bekliyor' : 'Yok', i: BadgeCheck, c: 'text-success' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <s.i size={16} className={s.c} />
            <div className="text-xs text-[color:var(--fg-muted)] mt-2">{s.l}</div>
            <div className="text-2xl font-bold mt-0.5">{s.v}</div>
          </CardBody></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Sparkles size={15} className="text-gold-300" /> Senin ilanların</h3>
            {myListings.length === 0 ? (
              <div className="text-sm text-[color:var(--fg-muted)] py-4 text-center">
                Henüz ilanın yok. <Link href="/new-listing" className="text-gold-300 hover:underline">İlk ilanını ver →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myListings.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/property/${p.slug}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[color:var(--bg-card-hover)]">
                    <img src={p.cover.kind === 'photo' ? p.cover.src : p.images[0]} alt="" className="size-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.title}</div>
                      <div className="text-xs text-[color:var(--fg-muted)]"><MapPin size={11} className="inline" /> {p.city} / {p.district}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gold-300">{formatPrice(p.price, p.currency)}</div>
                      <ScoreRing value={p.score.total} size={28} stroke={3} outOf={10} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold mb-3">Son bildirimler</h3>
            {notifications.length === 0 ? (
              <div className="text-sm text-[color:var(--fg-muted)] py-4 text-center">Henüz bildirim yok.</div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 4).map((n) => (
                  <Link key={n.id} href={n.link ?? '#'} className="block p-2.5 rounded-xl hover:bg-[color:var(--bg-card-hover)]">
                    <div className="flex items-start gap-2.5">
                      {!n.read && <span className="size-2 rounded-full bg-gold-400 mt-1.5 shrink-0" />}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">{n.body}</div>
                        <div className="text-[10px] text-[color:var(--fg-faint)] mt-1">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MyListings({ listings }: { listings: Property[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [upgradeFor, setUpgradeFor] = React.useState<Property | null>(null);
  const [deleteFor, setDeleteFor] = React.useState<Property | null>(null);
  const [working, setWorking] = React.useState(false);

  if (listings.length === 0) {
    return (
      <Card><CardBody className="text-center py-12">
        <Home size={28} className="text-gold-300 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold">Henüz ilanın yok</h3>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">İlk ilanını yayınla, yatırımcıların önüne çıksın.</p>
        <Link href="/new-listing"><Button variant="gold" size="md" className="mt-5">+ İlan Ver</Button></Link>
      </CardBody></Card>
    );
  }

  async function doUpgrade(tier: 'guclu' | 'premium') {
    if (!upgradeFor) return;
    setWorking(true);
    const res = await upgradeTierAction(upgradeFor.id, tier);
    setWorking(false);
    if (res.ok) {
      toast({ variant: 'success', title: 'Yükseltildi!', description: `İlan ${tier === 'premium' ? 'Premium' : 'Güçlü'} seviyeye geçti.` });
      setUpgradeFor(null);
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  async function doDelete() {
    if (!deleteFor) return;
    setWorking(true);
    const res = await deleteListingAction(deleteFor.id);
    setWorking(false);
    if (res.ok) {
      toast({ variant: 'success', title: 'İlan silindi' });
      setDeleteFor(null);
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Silinemedi', description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      {listings.map((p) => (
        <Card key={p.id}><CardBody className="flex items-center gap-4 flex-wrap">
          <img src={p.cover.kind === 'photo' ? p.cover.src : p.images[0]} alt="" className="size-20 sm:size-24 rounded-xl object-cover" />
          <div className="flex-1 min-w-[200px]">
            <Link href={`/property/${p.slug}`} className="font-semibold hover:text-gold-300 text-sm sm:text-base block truncate">{p.title}</Link>
            <div className="text-xs text-[color:var(--fg-muted)] mt-1 flex items-center gap-2 flex-wrap">
              <span><Eye size={11} className="inline" /> {p.views.toLocaleString('tr-TR')}</span>
              <span><Heart size={11} className="inline" /> {p.favorites}</span>
              <Badge variant={p.tier === 'premium' ? 'premium' : p.tier === 'guclu' ? 'ai' : 'outline'}>{p.tier}</Badge>
              {p.istbakuApproved && <Badge variant="success">Onaylı</Badge>}
            </div>
            <div className="text-sm font-bold text-gold-300 mt-1">{formatPrice(p.price, p.currency)}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {p.tier !== 'premium' && (
              <Button variant="outline" size="sm" onClick={() => setUpgradeFor(p)} className="gap-1">
                <Zap size={12} /> Yükselt
              </Button>
            )}
            <Link href={`/property/${p.slug}/edit`}>
              <Button variant="ghost" size="sm" className="gap-1"><Pencil size={12} /> Düzenle</Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10 gap-1" onClick={() => setDeleteFor(p)}>
              <Trash2 size={12} />
            </Button>
          </div>
        </CardBody></Card>
      ))}

      <Modal open={!!upgradeFor} onClose={() => setUpgradeFor(null)} title="İlanı yükselt">
        {upgradeFor && (
          <>
            <p className="text-sm text-[color:var(--fg-muted)] mb-4">
              <strong className="text-[color:var(--fg)]">{upgradeFor.title}</strong> ilanını üst sıralarda göstermek için seviye seç.
              Tek seferlik ödeme, 30 gün geçerli.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => doUpgrade('guclu')}
                disabled={working || upgradeFor.tier === 'guclu' || upgradeFor.tier === 'premium'}
                className="rounded-2xl border p-4 text-left hover:border-gold-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star size={18} className="text-gold-300" />
                <div className="font-bold mt-2">Güçlü</div>
                <div className="text-xs text-[color:var(--fg-muted)] mt-1">Foto + video kapak, yüksek görünürlük</div>
                <div className="mt-3 text-gold-300 font-bold">$9 / 30 gün</div>
              </button>
              <button
                onClick={() => doUpgrade('premium')}
                disabled={working || upgradeFor.tier === 'premium'}
                className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-left hover:border-amber-400 disabled:opacity-50"
              >
                <Badge variant="premium">★ Premium</Badge>
                <div className="font-bold mt-2">Premium</div>
                <div className="text-xs text-[color:var(--fg-muted)] mt-1">En üst sırada + ISTBAKU Onaylı süreci</div>
                <div className="mt-3 text-amber-300 font-bold">$29 / 30 gün</div>
              </button>
            </div>
            <p className="mt-4 text-[10px] text-[color:var(--fg-faint)]">
              Ödemeler iyzico ve Stripe altyapısı ile güvenli şekilde alınır.
            </p>
          </>
        )}
      </Modal>

      <Modal open={!!deleteFor} onClose={() => setDeleteFor(null)} title="İlanı sil?">
        {deleteFor && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="size-10 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <p className="text-sm text-[color:var(--fg-muted)]">
                <strong className="text-[color:var(--fg)]">{deleteFor.title}</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteFor(null)}>İptal</Button>
              <Button variant="danger" onClick={doDelete} loading={working}>
                <Trash2 size={14} /> Evet, sil
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Favorites({ favorites }: { favorites: Property[] }) {
  const router = useRouter();
  const fav = useFavorites();
  const { toast } = useToast();

  if (favorites.length === 0) {
    return (
      <Card><CardBody className="text-center py-12">
        <Heart size={28} className="text-danger mx-auto" />
        <h3 className="mt-3 text-lg font-semibold">Henüz favori yok</h3>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">İlanlardaki ❤ butonuyla beğendiklerini buraya ekle.</p>
        <Link href="/listings"><Button variant="gold" size="md" className="mt-5">İlanları Keşfet</Button></Link>
      </CardBody></Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[color:var(--fg-muted)]">{favorites.length} favori ilan</div>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger/10"
          onClick={async () => {
            for (const p of favorites) await fav.toggle(p.id);
            toast({ variant: 'info', title: 'Tüm favoriler temizlendi' });
            router.refresh();
          }}
        >
          Tümünü kaldır
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map((p) => <ListingCard key={p.id} property={p} compact />)}
      </div>
    </div>
  );
}

function CompareTab() {
  const compare = useCompare();
  return (
    <Card><CardBody className="text-center py-12">
      <GitCompare size={28} className="text-gold-300 mx-auto" />
      <h3 className="mt-3 text-lg font-semibold">
        {compare.count > 0
          ? `${compare.count} ilan karşılaştırmaya hazır`
          : 'Henüz karşılaştırma seçimi yok'}
      </h3>
      <p className="mt-1 text-sm text-[color:var(--fg-muted)] max-w-md mx-auto">
        İlan kartlarındaki karşılaştırma butonuyla seçim yap. En fazla 3 ilan kıyaslayabilirsin.
      </p>
      <div className="mt-5 flex justify-center gap-2 flex-wrap">
        <Link href="/listings"><Button variant="outline">İlanları Gez</Button></Link>
        {compare.count >= 2 && (
          <Link href="/compare"><Button variant="gold">Karşılaştır →</Button></Link>
        )}
      </div>
    </CardBody></Card>
  );
}

function Matches() {
  return (
    <Card><CardBody className="text-center py-12">
      <Sparkles size={28} className="text-gold-300 mx-auto" />
      <h3 className="mt-3 text-lg font-semibold">AI Eşleşmelerini başlat</h3>
      <p className="mt-1 text-sm text-[color:var(--fg-muted)] max-w-md mx-auto">
        Hedeflerini söyle, seçtiğin ülkelerden en uygun 5 ilanı sana getirelim — açıklamalı, karşılaştırmalı, şeffaf.
      </p>
      <Link href="/ai-match"><Button variant="gold" size="md" className="mt-5">Başla <ArrowUpRight size={14} /></Button></Link>
    </CardBody></Card>
  );
}

function SavedSearches({ initial }: { initial: SavedSearchUI[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState(initial);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function doDelete(id: string) {
    setDeleting(id);
    const res = await deleteSavedSearchAction(id);
    setDeleting(null);
    if (res.ok) {
      setItems((cur) => cur.filter((x) => x.id !== id));
      toast({ variant: 'success', title: 'Arama silindi' });
    }
  }

  if (items.length === 0) {
    return (
      <Card><CardBody className="text-center py-12">
        <Search size={28} className="text-gold-300 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold">Kayıtlı arama yok</h3>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">İlan ararken filtre uygulayıp "Aramayı Kaydet" ile ekle.</p>
        <Link href="/listings"><Button variant="gold" size="md" className="mt-5">İlanları Filtrele</Button></Link>
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((s) => (
        <Card key={s.id}><CardBody className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{s.name}</div>
            <div className="text-xs text-[color:var(--fg-muted)] mt-1 flex items-center gap-2">
              <span>{timeAgo(s.createdAt)}</span>
              {s.newMatches > 0 && <Badge variant="success">{s.newMatches} yeni</Badge>}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Link href="/listings">
              <Button variant="outline" size="sm" className="gap-1"><ExternalLink size={12} /> Aç</Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => doDelete(s.id)}
              loading={deleting === s.id}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </CardBody></Card>
      ))}
    </div>
  );
}

function Notifications({ initial }: { initial: NotificationUI[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState(initial);
  const unread = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await markNotificationReadAction(id);
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }
  async function markAll() {
    await markAllNotificationsReadAction();
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    toast({ variant: 'success', title: 'Tümü okundu işaretlendi' });
  }

  if (items.length === 0) {
    return (
      <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
        <Bell size={28} className="mx-auto text-gold-300" />
        <p className="mt-3">Bildirim yok.</p>
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-[color:var(--fg-muted)]">{unread} okunmamış bildirim</div>
        {unread > 0 && (
          <button onClick={markAll} className="text-xs text-gold-300 hover:text-gold-400">Tümünü okundu işaretle</button>
        )}
      </div>
      {items.map((n) => (
        <Card key={n.id}><CardBody className="flex items-start gap-3">
          {!n.read && <span className="size-2 rounded-full bg-gold-400 mt-2 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="font-medium">{n.title}</div>
            <div className="text-sm text-[color:var(--fg-muted)] mt-0.5">{n.body}</div>
            <div className="text-[10px] text-[color:var(--fg-faint)] mt-1.5">{timeAgo(n.createdAt)}</div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {n.link && <Link href={n.link}><Button variant="ghost" size="sm">Aç →</Button></Link>}
            {!n.read && (
              <button onClick={() => markRead(n.id)} className="text-[11px] text-[color:var(--fg-muted)] hover:text-gold-300">İşaretle</button>
            )}
          </div>
        </CardBody></Card>
      ))}
    </div>
  );
}

function DailyBookingsTab({ initial }: { initial: DailyBookingUI[] }) {
  const { toast } = useToast();
  const [list, setList] = React.useState(initial);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [processing, setProcessing] = React.useState<string | null>(null);

  async function approve(id: string) {
    setProcessing(id);
    const { approveDailyBookingAction } = await import('@/lib/daily-booking-actions');
    const res = await approveDailyBookingAction(id);
    setProcessing(null);
    if (res.ok) {
      setList((cur) => cur.map((b) => b.id === id ? { ...b, status: 'approved' as const } : b));
      toast({ variant: 'success', title: 'Onaylandı', description: 'Misafire bildirim gönderildi.' });
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  async function reject(id: string) {
    if (reason.trim().length < 3) {
      toast({ variant: 'error', title: 'Red sebebi gerekli', description: 'Lütfen kısa bir açıklama yaz.' });
      return;
    }
    setProcessing(id);
    const { rejectDailyBookingAction } = await import('@/lib/daily-booking-actions');
    const res = await rejectDailyBookingAction(id, reason);
    setProcessing(null);
    if (res.ok) {
      setList((cur) => cur.map((b) => b.id === id ? { ...b, status: 'rejected' as const, ownerResponseNote: reason } : b));
      setRejecting(null);
      setReason('');
      toast({ variant: 'success', title: 'Reddedildi', description: 'Misafire bildirim gönderildi.' });
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  if (list.length === 0) {
    return (
      <Card glass><CardBody className="p-8 text-center text-sm text-[color:var(--fg-muted)]">
        <CalendarDays size={32} className="mx-auto text-gold-300 mb-3" />
        Henüz günlük kira rezervasyon talebin yok. İlanlarında günlük kira aktifse misafirler buraya talep gönderir.
      </CardBody></Card>
    );
  }

  const statusLabel: Record<DailyBookingUI['status'], { l: string; cls: string }> = {
    pending:   { l: 'Bekliyor',  cls: 'bg-gold-400/15 text-gold-300' },
    approved:  { l: 'Onaylandı', cls: 'bg-success/15 text-success' },
    rejected:  { l: 'Reddedildi', cls: 'bg-danger/15 text-danger' },
    cancelled: { l: 'İptal',     cls: 'bg-[color:var(--bg-card-hover)] text-[color:var(--fg-muted)]' },
    completed: { l: 'Tamamlandı', cls: 'bg-navy-700/40 text-navy-200' },
  };

  return (
    <div className="space-y-3">
      {list.map((b) => {
        const s = statusLabel[b.status];
        return (
          <Card key={b.id} className="overflow-hidden">
            <CardBody className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold', s.cls)}>
                      {s.l}
                    </span>
                    <span className="text-xs text-[color:var(--fg-muted)]">{timeAgo(b.createdAt)}</span>
                  </div>
                  <div className="mt-1.5 font-semibold">
                    {new Date(b.checkIn).toLocaleDateString('tr-TR')} → {new Date(b.checkOut).toLocaleDateString('tr-TR')}
                  </div>
                  <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">
                    {b.nights} gece · {b.guestCount} misafir · {formatPrice(b.totalPrice, b.currency)}
                  </div>
                  <div className="text-xs mt-2">
                    <strong>{b.guestName}</strong> · {b.guestEmail}{b.guestPhone ? ` · ${b.guestPhone}` : ''}
                  </div>
                  {b.notes && (
                    <div className="mt-2 text-xs text-[color:var(--fg-muted)] italic rounded bg-[color:var(--bg-elev)] p-2">
                      &ldquo;{b.notes}&rdquo;
                    </div>
                  )}
                  {b.ownerResponseNote && (
                    <div className="mt-2 text-xs rounded bg-[color:var(--bg-elev)] p-2">
                      <span className="text-[color:var(--fg-muted)]">Notum: </span>{b.ownerResponseNote}
                    </div>
                  )}
                </div>

                {b.status === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => approve(b.id)}
                      disabled={processing === b.id}
                      className="gap-1.5"
                    >
                      <Check size={14} /> Onayla
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRejecting(b.id); setReason(''); }}
                      disabled={processing === b.id}
                      className="gap-1.5 !text-danger !border-danger/30"
                    >
                      <X size={14} /> Reddet
                    </Button>
                  </div>
                )}
              </div>

              {rejecting === b.id && (
                <div className="mt-4 rounded-lg border bg-[color:var(--bg-elev)] p-3 space-y-2">
                  <div className="text-xs font-semibold">Red sebebi</div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border bg-transparent p-2 text-sm"
                    placeholder="Örn: Bu tarihler kişisel kullanım için tutulu."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setRejecting(null); setReason(''); }}>İptal</Button>
                    <Button variant="primary" size="sm" onClick={() => reject(b.id)} disabled={processing === b.id}>
                      Reddi Gönder
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function PaymentsTab({ payments }: { payments: PaymentUI[] }) {
  if (payments.length === 0) {
    return (
      <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
        <CreditCard size={28} className="mx-auto text-gold-300 mb-3" />
        <p className="font-medium">Henüz ödeme yok</p>
        <p className="text-xs mt-1">İlan yükseltme, tarih yenileme gibi işlemler burada görünecek.</p>
      </CardBody></Card>
    );
  }

  const total = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Ödeme Geçmişi</h2>
        <div className="text-sm text-[color:var(--fg-muted)]">
          Toplam: <span className="font-bold text-[color:var(--fg)]">${(total / 100).toFixed(2)}</span>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-[color:var(--fg-muted)]">
                <th className="px-4 py-3 font-medium">İşlem</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {payments.map((p) => {
                const st = PAYMENT_STATUS_LABELS[p.status] ?? { l: p.status, v: 'default' as const };
                return (
                  <tr key={p.id} className="hover:bg-[color:var(--bg-card-hover)]">
                    <td className="px-4 py-3 font-medium">{PAYMENT_TYPE_LABELS[p.type] ?? p.type}</td>
                    <td className="px-4 py-3">${(p.amount / 100).toFixed(2)} {p.currency}</td>
                    <td className="px-4 py-3"><Badge variant={st.v}>{st.l}</Badge></td>
                    <td className="px-4 py-3 text-[color:var(--fg-muted)] hidden sm:table-cell">
                      {new Date(p.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

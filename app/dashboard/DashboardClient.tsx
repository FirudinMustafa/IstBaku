'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Heart, GitCompare, Bell, Sparkles, Search,
  Eye, MapPin, ArrowUpRight, BadgeCheck, Pencil, Trash2,
  Zap, AlertTriangle, ExternalLink, CalendarDays, Check, X,
  CreditCard, Settings, Crown, RefreshCw, ShieldCheck, Loader2, FileText,
} from 'lucide-react';
import { AccountSettings } from './AccountSettings';
import { RpaReportTab } from './RpaReportTab';
import type { MyRpaReport } from '@/lib/rpa-actions';
import { MyAppointmentsClient, type MyAppt } from '@/components/appointments/MyAppointmentsClient';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaymentModal, type PendingPayment } from '@/components/payments/PaymentModal';
import { ListingCard } from '@/components/listings/ListingCard';
import { FavoritesPanel } from '@/components/dashboard/FavoritesPanel';
import { ScoreRing } from '@/components/listings/ScoreRing';
import { useNotifications } from '@/lib/notifications-store';
import { signOutAction, type PublicUser } from '@/lib/auth-actions';
import { upgradeTierAction, deleteListingAction, deleteSavedSearchAction } from '@/lib/listing-actions';
import { renewListingDateAction, requestPremiumUpgradeAction } from '@/lib/listing-owner-actions';
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/notification-actions';
import { useCompare } from '@/lib/compare-store';
import { formatPrice, formatUsdCents } from '@/lib/currency';
import { useCurrency } from '@/lib/currency-store';
import { timeAgo, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import type { Property } from '@/lib/types';

const TABS = [
  { k: 'overview', lk: 'dash.tab.overview', i: Home },
  { k: 'listings', lk: 'dash.tab.listings', i: Home },
  { k: 'daily-bookings', lk: 'dash.tab.dailyBookings', i: CalendarDays },
  { k: 'appointments', lk: 'dash.tab.appointments', i: CalendarDays },
  { k: 'favorites', lk: 'dash.tab.favorites', i: Heart },
  { k: 'compare', lk: 'dash.tab.compare', i: GitCompare },
  { k: 'matches', lk: 'dash.tab.matches', i: Sparkles },
  { k: 'searches', lk: 'dash.tab.searches', i: Search },
  { k: 'payments', lk: 'dash.tab.payments', i: CreditCard },
  { k: 'rpa-reports', lk: 'dash.tab.rpaReports', i: FileText },
  { k: 'notifications', lk: 'dash.tab.notifications', i: Bell },
  { k: 'settings', lk: 'dash.tab.settings', i: Settings },
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
  favorites: (Property & { collectionId: string | null })[];
  savedSearches: SavedSearchUI[];
  notifications: NotificationUI[];
  dailyBookings: DailyBookingUI[];
  myAppointments: MyAppt[];
  payments: PaymentUI[];
  rpaReports: MyRpaReport[];
  /** Admin'den ayarlanabilir platform fiyatları (USD cent). */
  prices: { renewal: number; badge: number; guclu: number; premium: number; rpaReport: number };
}

// Ödeme tipi/durumu etiketleri i18n'dedir (enums.paymentType.* / enums.paymentStatus.*).
// Burada yalnızca durum → rozet varyantı eşlemesi tutulur.
const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'gold' | 'danger' | 'default'> = {
  paid: 'success',
  pending: 'gold',
  failed: 'danger',
  refunded: 'default',
};

export function DashboardClient({ initialUser, myListings, favorites, savedSearches, notifications, dailyBookings, myAppointments, payments, rpaReports, prices }: Props) {
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
  const { toast } = useToast();
  const { t } = useLang();
  // Hydration: badge sadece client tarafında mount sonrası render olsun
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const showUnread = mounted && unread > 0;
  // Kapital Bank ödeme dönüşü (?payment=success|failed) — bir kez toast göster, paramı temizle.
  const paymentToastRef = React.useRef(false);
  React.useEffect(() => {
    const pay = sp.get('payment');
    if (!pay || paymentToastRef.current) return;
    paymentToastRef.current = true;
    if (pay === 'success') {
      toast({ variant: 'success', title: t('pay.success.title'), description: t('pay.success.desc') });
    } else if (pay === 'failed') {
      // Bankadan gelen KESIN sebep (?reason=insufficient|expired_card|…) → i18n mesajı.
      const reason = sp.get('reason') || 'generic';
      toast({ variant: 'error', title: t('pay.fail.title'), description: t(`pay.fail.${reason}`) });
    }
    const params = new URLSearchParams(sp.toString());
    params.delete('payment');
    params.delete('reason');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sp, router, pathname, t]);
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('dash.welcome')} {user.name.split(' ')[0]}</h1>
            <p className="text-xs text-[color:var(--fg-muted)] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="truncate max-w-[180px]">{user.email}</span>
              {user.premium && <Badge variant="premium" className="!text-[10px]"><BadgeCheck size={11} /> Premium</Badge>}
              {user.kycStatus === 'approved' && <Badge variant="success" className="!text-[10px]">KYC ✓</Badge>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/new-listing"><Button variant="gold" size="md">{t('dash.addListing')}</Button></Link>
          <Button variant="ghost" size="md" onClick={signOut} className="text-danger hover:bg-danger/10">{t('dash.signOut')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit space-y-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="flex lg:flex-col gap-1 lg:gap-1 min-w-max lg:min-w-0">
            {TABS.map((item) => (
              <button
                key={item.k}
                onClick={() => setTab(item.k)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm border transition-colors whitespace-nowrap',
                  tab === item.k ? 'bg-gold-400/15 border-gold-400/40 text-gold-300' : 'border-transparent hover:bg-[color:var(--bg-card-hover)]',
                )}
              >
                <span className="inline-flex items-center gap-2.5"><item.i size={15} /> {t(item.lk)}</span>
                {item.k === 'notifications' && showUnread && (
                  <span className="text-[10px] rounded-full bg-gold-400 text-navy-900 px-1.5">{unread}</span>
                )}
                {item.k === 'favorites' && favorites.length > 0 && (
                  <span className="text-[10px] text-[color:var(--fg-muted)]">{favorites.length}</span>
                )}
                {item.k === 'listings' && myListings.length > 0 && (
                  <span className="text-[10px] text-[color:var(--fg-muted)]">{myListings.length}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main>
          {tab === 'overview' && <Overview user={user} myListings={myListings} favorites={favorites} notifications={notifications} />}
          {tab === 'listings' && <MyListings listings={myListings} prices={prices} />}
          {tab === 'daily-bookings' && <DailyBookingsTab initial={dailyBookings} />}
          {tab === 'appointments' && <MyAppointmentsClient appointments={myAppointments} />}
          {tab === 'favorites' && <FavoritesPanel favorites={favorites} />}
          {tab === 'compare' && <CompareTab />}
          {tab === 'matches' && <Matches />}
          {tab === 'searches' && <SavedSearches initial={savedSearches} />}
          {tab === 'payments' && <PaymentsTab payments={payments} />}
          {tab === 'rpa-reports' && <RpaReportTab myListings={myListings} reports={rpaReports} priceUsdCents={prices.rpaReport} />}
          {tab === 'notifications' && <Notifications initial={notifications} />}
          {tab === 'settings' && <AccountSettings />}
        </main>
      </div>
    </div>
  );
}

function Overview({ user, myListings, favorites, notifications }: { user: PublicUser; myListings: Property[]; favorites: Property[]; notifications: NotificationUI[] }) {
  const { t } = useLang();
  const totalViews = myListings.reduce((a, p) => a + p.views, 0);
  const stats = [
    { l: t('dash.stat.activeListings'), v: String(myListings.length), i: Home, c: 'text-gold-300', href: undefined as string | undefined },
    { l: t('dash.stat.favorites'), v: String(favorites.length), i: Heart, c: 'text-danger', href: undefined as string | undefined },
    { l: t('dash.stat.views'), v: totalViews.toLocaleString('tr-TR'), i: Eye, c: 'text-navy-300', href: undefined as string | undefined },
    { l: t('dash.stat.kyc'), v: user.kycStatus === 'approved' ? t('dash.kyc.approved') : user.kycStatus === 'pending' ? t('dash.kyc.pending') : t('dash.kyc.none'), i: BadgeCheck, c: 'text-success', href: user.kycStatus === 'approved' ? undefined : '/kyc' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const card = (
            <CardBody className="p-4">
              <s.i size={16} className={s.c} />
              <div className="text-xs text-[color:var(--fg-muted)] mt-2">{s.l}</div>
              <div className="text-2xl font-bold mt-0.5">{s.v}</div>
              {s.href && <div className="mt-1 text-[11px] text-gold-300">{t('dash.verify')}</div>}
            </CardBody>
          );
          return s.href ? (
            <Link key={s.l} href={s.href}><Card className="hover:border-gold-400/50 transition-colors">{card}</Card></Link>
          ) : (
            <Card key={s.l}>{card}</Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Sparkles size={15} className="text-gold-300" /> {t('dash.yourListings')}</h3>
            {myListings.length === 0 ? (
              <div className="text-sm text-[color:var(--fg-muted)] py-4 text-center">
                {t('dash.noListings')} <Link href="/new-listing" className="text-gold-300 hover:underline">{t('dash.firstListing')}</Link>
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
            <h3 className="font-semibold mb-3">{t('dash.recentNotifs')}</h3>
            {notifications.length === 0 ? (
              <div className="text-sm text-[color:var(--fg-muted)] py-4 text-center">{t('dash.noNotifs')}</div>
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

function MyListings({ listings, prices }: { listings: Property[]; prices: { renewal: number; badge: number; guclu: number; premium: number } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [upgradeFor, setUpgradeFor] = React.useState<Property | null>(null);
  const [deleteFor, setDeleteFor] = React.useState<Property | null>(null);
  const [working, setWorking] = React.useState(false);
  const [pendingPayment, setPendingPayment] = React.useState<PendingPayment | null>(null);
  const upgradeSuccessRef = React.useRef<'guclu' | 'premium'>('guclu');
  // Tarih yenileme / İstBaku onaylı ödemeleri için başarı mesajı.
  const ownerSuccessRef = React.useRef<{ title: string; description: string } | null>(null);
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);
  const { currency } = useCurrency();
  // Admin ücretleri USD cent — kullanıcının seçtiği para biriminde göster (Madde 10).
  const usd = (cents: number) => formatUsdCents(cents, currency);

  async function startRenew(p: Property) {
    setLoadingAction(`renew-${p.id}`);
    const res = await renewListingDateAction(p.id);
    setLoadingAction(null);
    if (!res.ok) { toast({ variant: 'error', title: t('common.error'), description: res.error }); return; }
    ownerSuccessRef.current = { title: t('pay.dateRenewed.title'), description: t('pay.dateRenewed.desc') };
    setPendingPayment({ paymentId: res.paymentId, amount: res.amount, currency: res.currency, checkoutUrl: res.checkoutUrl, title: t('pay.renew.title'), description: t('pay.renew.desc') });
  }

  async function startApprove(p: Property) {
    setLoadingAction(`approve-${p.id}`);
    const res = await requestPremiumUpgradeAction(p.id);
    setLoadingAction(null);
    if (!res.ok) { toast({ variant: 'error', title: t('common.error'), description: res.error }); return; }
    ownerSuccessRef.current = { title: t('pay.approved.title'), description: t('pay.approvedBadge.desc') };
    setPendingPayment({ paymentId: res.paymentId, amount: res.amount, currency: res.currency, checkoutUrl: res.checkoutUrl, title: t('pay.badge.title'), description: t('pay.badge.desc') });
  }

  if (listings.length === 0) {
    return (
      <Card><CardBody className="text-center py-12">
        <Home size={28} className="text-gold-300 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold">{t('dash.ml.emptyTitle')}</h3>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{t('dash.ml.emptyDesc')}</p>
        <Link href="/new-listing"><Button variant="gold" size="md" className="mt-5">{t('dash.ml.emptyButton')}</Button></Link>
      </CardBody></Card>
    );
  }

  async function doUpgrade(tier: 'guclu' | 'premium') {
    if (!upgradeFor) return;
    ownerSuccessRef.current = null; // tier yükseltme — owner mesajını temizle
    setWorking(true);
    const res = await upgradeTierAction(upgradeFor.id, tier);
    setWorking(false);
    if (res.ok) {
      // Ödeme penceresini aç; onay sonrası tier yükselir.
      upgradeSuccessRef.current = tier;
      setUpgradeFor(null);
      setPendingPayment({
        paymentId: res.paymentId,
        amount: res.amount,
        currency: res.currency,
        checkoutUrl: res.checkoutUrl,
        title: tier === 'premium' ? t('pay.premiumListing.title') : t('pay.strongListing.title'),
        description: tier === 'premium' ? t('pay.premiumListing.desc') : t('pay.strongListing.desc'),
      });
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  async function onUpgradePaid() {
    setPendingPayment(null);
    // Tarih yenileme / onaylı ödemesi ise ona ait mesajı göster; değilse tier yükseltme.
    if (ownerSuccessRef.current) {
      const msg = ownerSuccessRef.current;
      ownerSuccessRef.current = null;
      toast({ variant: 'success', title: msg.title, description: msg.description });
    } else {
      const tier = upgradeSuccessRef.current;
      toast({ variant: 'success', title: t('pay.upgraded.title'), description: tier === 'premium' ? t('pay.upgraded.descPremium') : t('pay.upgraded.descGuclu') });
    }
    router.refresh();
  }

  async function doDelete() {
    if (!deleteFor) return;
    setWorking(true);
    const res = await deleteListingAction(deleteFor.id);
    setWorking(false);
    if (res.ok) {
      toast({ variant: 'success', title: t('dash.toast.listingDeleted') });
      setDeleteFor(null);
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('dash.toast.deleteFailed'), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/office-performance"
        className="flex items-center justify-between gap-3 rounded-xl border border-gold-400/30 bg-gold-400/5 px-4 py-3 hover:border-gold-400/60 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <Crown size={15} className="text-gold-300" /> {t('dash.ml.officeLink')}
        </span>
        <ArrowUpRight size={16} className="text-gold-300" />
      </Link>
      {listings.map((p) => (
        <Card key={p.id}><CardBody className="flex items-center gap-4 flex-wrap">
          <img src={p.cover.kind === 'photo' ? p.cover.src : p.images[0]} alt="" className="size-20 sm:size-24 rounded-xl object-cover" />
          <div className="flex-1 min-w-[200px]">
            <Link href={`/property/${p.slug}`} className="font-semibold hover:text-gold-300 text-sm sm:text-base block truncate">{p.title}</Link>
            <div className="text-xs text-[color:var(--fg-muted)] mt-1 flex items-center gap-2 flex-wrap">
              <span><Eye size={11} className="inline" /> {p.views.toLocaleString('tr-TR')}</span>
              <span><Heart size={11} className="inline" /> {p.favorites}</span>
              <Badge variant={p.tier === 'premium' ? 'premium' : p.tier === 'guclu' ? 'ai' : 'outline'}>{t(`enums.tier.${p.tier}`)}</Badge>
              {p.istbakuApproved && <Badge variant="success">{t('listings.approvedShort')}</Badge>}
            </div>
            <div className="text-sm font-bold text-gold-300 mt-1">{formatPrice(p.price, p.currency)}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRenew(p)}
              disabled={loadingAction !== null}
              className="gap-1"
            >
              {loadingAction === `renew-${p.id}` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {t('dash.ml.renew')} ({usd(prices.renewal)})
            </Button>
            {!p.istbakuApproved && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => startApprove(p)}
                disabled={loadingAction !== null}
                className="gap-1"
              >
                {loadingAction === `approve-${p.id}` ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} className="text-gold-300" />}
                {t('dash.ml.approve')} ({usd(prices.badge)})
              </Button>
            )}
            {p.tier !== 'premium' && (
              <Button variant="outline" size="sm" onClick={() => setUpgradeFor(p)} className="gap-1">
                <Zap size={12} /> {t('dash.ml.upgrade')}
              </Button>
            )}
            <Link href={`/property/${p.slug}/edit`}>
              <Button variant="ghost" size="sm" className="gap-1"><Pencil size={12} /> {t('dash.ml.edit')}</Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10 gap-1" onClick={() => setDeleteFor(p)}>
              <Trash2 size={12} />
            </Button>
          </div>
        </CardBody></Card>
      ))}

      <Modal open={!!upgradeFor} onClose={() => setUpgradeFor(null)} title={t('dash.ml.upgradeTitle')}>
        {upgradeFor && (
          <>
            <p className="text-sm text-[color:var(--fg-muted)] mb-4">
              <strong className="text-[color:var(--fg)]">{upgradeFor.title}</strong> {t('dash.ml.upgradeDesc')}
            </p>
            {/* D2: 'Güçlü' tier kaldırıldı — yalnız İstBaku Onaylı (premium) yükseltmesi. */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => doUpgrade('premium')}
                disabled={working || upgradeFor.tier === 'premium'}
                className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-left hover:border-amber-400 disabled:opacity-50"
              >
                <Badge variant="premium">★ {t('enums.tier.premium')}</Badge>
                <div className="font-bold mt-2">{t('enums.tier.premium')}</div>
                <div className="text-xs text-[color:var(--fg-muted)] mt-1">{t('dash.ml.premiumDesc')}</div>
                <div className="mt-3 text-amber-300 font-bold">{usd(prices.premium)} {t('dash.ml.per30')}</div>
              </button>
            </div>
            <p className="mt-4 text-[10px] text-[color:var(--fg-faint)]">
              {t('dash.ml.upgradeFooter')}
            </p>
          </>
        )}
      </Modal>

      <PaymentModal
        open={!!pendingPayment}
        payment={pendingPayment}
        onClose={() => setPendingPayment(null)}
        onSuccess={onUpgradePaid}
      />

      <Modal open={!!deleteFor} onClose={() => setDeleteFor(null)} title={t('dash.ml.deleteTitle')}>
        {deleteFor && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="size-10 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <p className="text-sm text-[color:var(--fg-muted)]">
                <strong className="text-[color:var(--fg)]">{deleteFor.title}</strong> {t('dash.ml.deleteDesc')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteFor(null)}>{t('dash.cancel')}</Button>
              <Button variant="danger" onClick={doDelete} loading={working}>
                <Trash2 size={14} /> {t('dash.ml.deleteConfirm')}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function CompareTab() {
  const compare = useCompare();
  const { t } = useLang();
  return (
    <Card><CardBody className="text-center py-12">
      <GitCompare size={28} className="text-gold-300 mx-auto" />
      <h3 className="mt-3 text-lg font-semibold">
        {compare.count > 0
          ? `${compare.count} ${t('dash.cmp.ready')}`
          : t('dash.cmp.emptyTitle')}
      </h3>
      <p className="mt-1 text-sm text-[color:var(--fg-muted)] max-w-md mx-auto">
        {t('dash.cmp.emptyDesc')}
      </p>
      <div className="mt-5 flex justify-center gap-2 flex-wrap">
        <Link href="/listings"><Button variant="outline">{t('dash.cmp.browse')}</Button></Link>
        {compare.count >= 2 && (
          <Link href="/compare"><Button variant="gold">{t('dash.cmp.compare')}</Button></Link>
        )}
      </div>
    </CardBody></Card>
  );
}

function Matches() {
  const { t } = useLang();
  return (
    <Card><CardBody className="text-center py-12">
      <Sparkles size={28} className="text-gold-300 mx-auto" />
      <h3 className="mt-3 text-lg font-semibold">{t('dash.match.title')}</h3>
      <p className="mt-1 text-sm text-[color:var(--fg-muted)] max-w-md mx-auto">
        {t('dash.match.desc')}
      </p>
      <Link href="/ai-match"><Button variant="gold" size="md" className="mt-5">{t('dash.match.start')} <ArrowUpRight size={14} /></Button></Link>
    </CardBody></Card>
  );
}

function SavedSearches({ initial }: { initial: SavedSearchUI[] }) {
  const { toast } = useToast();
  const { t } = useLang();
  const [items, setItems] = React.useState(initial);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function doDelete(id: string) {
    setDeleting(id);
    const res = await deleteSavedSearchAction(id);
    setDeleting(null);
    if (res.ok) {
      setItems((cur) => cur.filter((x) => x.id !== id));
      toast({ variant: 'success', title: t('dash.toast.searchDeleted') });
    }
  }

  if (items.length === 0) {
    return (
      <Card><CardBody className="text-center py-12">
        <Search size={28} className="text-gold-300 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold">{t('dash.ss.emptyTitle')}</h3>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{t('dash.ss.emptyDesc')}</p>
        <Link href="/listings"><Button variant="gold" size="md" className="mt-5">{t('dash.ss.emptyButton')}</Button></Link>
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
              {s.newMatches > 0 && <Badge variant="success">{s.newMatches} {t('dash.ss.newBadge')}</Badge>}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Link href="/listings">
              <Button variant="outline" size="sm" className="gap-1"><ExternalLink size={12} /> {t('dash.ss.open')}</Button>
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
  const { t } = useLang();
  const [items, setItems] = React.useState(initial);
  const unread = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await markNotificationReadAction(id);
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }
  async function markAll() {
    await markAllNotificationsReadAction();
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    toast({ variant: 'success', title: t('dash.toast.allRead') });
  }

  if (items.length === 0) {
    return (
      <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
        <Bell size={28} className="mx-auto text-gold-300" />
        <p className="mt-3">{t('dash.notif.empty')}</p>
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-[color:var(--fg-muted)]">{unread} {t('dash.notif.unread')}</div>
        {unread > 0 && (
          <button onClick={markAll} className="text-xs text-gold-300 hover:text-gold-400">{t('dash.notif.markAll')}</button>
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
            {n.link && <Link href={n.link}><Button variant="ghost" size="sm">{t('dash.notif.open')}</Button></Link>}
            {!n.read && (
              <button onClick={() => markRead(n.id)} className="text-[11px] text-[color:var(--fg-muted)] hover:text-gold-300">{t('dash.notif.mark')}</button>
            )}
          </div>
        </CardBody></Card>
      ))}
    </div>
  );
}

function DailyBookingsTab({ initial }: { initial: DailyBookingUI[] }) {
  const { toast } = useToast();
  const { t } = useLang();
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
      toast({ variant: 'success', title: t('dash.book.approved'), description: t('dash.toast.bookingApproved.desc') });
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  async function reject(id: string) {
    if (reason.trim().length < 3) {
      toast({ variant: 'error', title: t('dash.toast.reasonRequired.title'), description: t('dash.toast.reasonRequired.desc') });
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
      toast({ variant: 'success', title: t('dash.book.rejected'), description: t('dash.toast.bookingApproved.desc') });
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  if (list.length === 0) {
    return (
      <Card glass><CardBody className="p-8 text-center text-sm text-[color:var(--fg-muted)]">
        <CalendarDays size={32} className="mx-auto text-gold-300 mb-3" />
        {t('dash.book.empty')}
      </CardBody></Card>
    );
  }

  const statusLabel: Record<DailyBookingUI['status'], { l: string; cls: string }> = {
    pending:   { l: t('dash.book.pending'),   cls: 'bg-gold-400/15 text-gold-300' },
    approved:  { l: t('dash.book.approved'),  cls: 'bg-success/15 text-success' },
    rejected:  { l: t('dash.book.rejected'),  cls: 'bg-danger/15 text-danger' },
    cancelled: { l: t('dash.book.cancelled'), cls: 'bg-[color:var(--bg-card-hover)] text-[color:var(--fg-muted)]' },
    completed: { l: t('dash.book.completed'), cls: 'bg-navy-700/40 text-navy-200' },
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
                    {b.nights} {t('dash.book.nights')} · {b.guestCount} {t('dash.book.guests')} · {formatPrice(b.totalPrice, b.currency)}
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
                      <span className="text-[color:var(--fg-muted)]">{t('dash.book.noteLabel')} </span>{b.ownerResponseNote}
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
                      <Check size={14} /> {t('dash.book.approve')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRejecting(b.id); setReason(''); }}
                      disabled={processing === b.id}
                      className="gap-1.5 !text-danger !border-danger/30"
                    >
                      <X size={14} /> {t('dash.book.reject')}
                    </Button>
                  </div>
                )}
              </div>

              {rejecting === b.id && (
                <div className="mt-4 rounded-lg border bg-[color:var(--bg-elev)] p-3 space-y-2">
                  <div className="text-xs font-semibold">{t('dash.book.reason')}</div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border bg-transparent p-2 text-sm"
                    placeholder={t('dash.book.reasonPh')}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setRejecting(null); setReason(''); }}>{t('dash.cancel')}</Button>
                    <Button variant="primary" size="sm" onClick={() => reject(b.id)} disabled={processing === b.id}>
                      {t('dash.book.sendReject')}
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
  const { t } = useLang();
  if (payments.length === 0) {
    return (
      <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
        <CreditCard size={28} className="mx-auto text-gold-300 mb-3" />
        <p className="font-medium">{t('dash.payments.emptyTitle')}</p>
        <p className="text-xs mt-1">{t('dash.payments.emptyDesc')}</p>
      </CardBody></Card>
    );
  }

  const total = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('dash.payments.history')}</h2>
        <div className="text-sm text-[color:var(--fg-muted)]">
          {t('dash.payments.total')} <span className="font-bold text-[color:var(--fg)]">${(total / 100).toFixed(2)}</span>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-[color:var(--fg-muted)]">
                <th className="px-4 py-3 font-medium">{t('dash.payments.colTransaction')}</th>
                <th className="px-4 py-3 font-medium">{t('dash.payments.colAmount')}</th>
                <th className="px-4 py-3 font-medium">{t('dash.payments.colStatus')}</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">{t('dash.payments.colDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {payments.map((p) => {
                const stVariant = PAYMENT_STATUS_VARIANT[p.status] ?? 'default';
                return (
                  <tr key={p.id} className="hover:bg-[color:var(--bg-card-hover)]">
                    <td className="px-4 py-3 font-medium">{t(`enums.paymentType.${p.type}`)}</td>
                    <td className="px-4 py-3">${(p.amount / 100).toFixed(2)} {p.currency}</td>
                    <td className="px-4 py-3"><Badge variant={stVariant}>{t(`enums.paymentStatus.${p.status}`)}</Badge></td>
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

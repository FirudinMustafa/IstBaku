import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';
import { getCurrentUser } from '@/lib/auth-actions';
import { getMyListings, getMySavedSearchesAction, getMyPayments } from '@/lib/listing-actions';
import { getMyFavoritesAction } from '@/lib/favorite-actions';
import { getMyNotifications } from '@/lib/notification-actions';
import { getOwnerDailyBookings } from '@/lib/daily-booking-actions';
import { getMyAppointments } from '@/lib/appointment-actions';
import { getAllPrices } from '@/lib/pricing';
import { getMyRpaReports } from '@/lib/rpa-actions';
import { rowToProperty } from '@/lib/db-mappers';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/dashboard');

  const [myListings, favorites, savedSearches, notifications, dailyBookings, myAppointments, payments, prices, rpaReports] = await Promise.all([
    getMyListings(),
    getMyFavoritesAction(),
    getMySavedSearchesAction(),
    getMyNotifications(),
    getOwnerDailyBookings(user.id).catch(() => []),
    getMyAppointments().catch(() => []),
    getMyPayments(),
    getAllPrices(),
    getMyRpaReports(),
  ]);

  return (
    <Suspense fallback={<div className="p-12 text-[color:var(--fg-muted)]">Yükleniyor…</div>}>
      <DashboardClient
        initialUser={user}
        myListings={myListings.map(rowToProperty)}
        favorites={favorites}
        savedSearches={savedSearches.map((s) => ({
          id: s.id,
          name: s.name,
          createdAt: s.createdAt.toISOString(),
          newMatches: s.newMatches,
        }))}
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        }))}
        payments={payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          type: p.type,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        }))}
        dailyBookings={dailyBookings.map((b) => ({
          id: b.id,
          listingId: b.listingId,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          checkIn: b.checkIn.toISOString(),
          checkOut: b.checkOut.toISOString(),
          nights: b.nights,
          totalPrice: b.totalPrice,
          currency: b.currency,
          guestCount: b.guestCount,
          status: b.status,
          notes: b.notes,
          ownerResponseNote: b.ownerResponseNote,
          createdAt: b.createdAt.toISOString(),
        }))}
        myAppointments={myAppointments.map((a) => ({
          id: a.id,
          scheduledAt: a.scheduledAt.toISOString(),
          proposedAt: a.proposedAt ? a.proposedAt.toISOString() : null,
          status: a.status,
          listingTitle: a.listingTitle,
          listingSlug: a.listingSlug,
          listingCountry: a.listingCountry,
          agentName: a.agentName,
        }))}
        rpaReports={rpaReports}
        prices={{
          renewal: prices.date_renewal,
          badge: prices.istbaku_badge,
          guclu: prices.tier_guclu,
          premium: prices.tier_premium,
          rpaReport: prices.rpa_report,
        }}
      />
    </Suspense>
  );
}

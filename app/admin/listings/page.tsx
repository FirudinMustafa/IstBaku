import { db } from '@/db/client';
import * as s from '@/db/schema';
import { desc, isNull, eq } from 'drizzle-orm';
import { ListingsAdminClient } from './ListingsAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminListingsPage() {
  const rows = await db
    .select({
      id: s.listings.id,
      listingNumber: s.listings.listingNumber,
      slug: s.listings.slug,
      title: s.listings.title,
      city: s.listings.city,
      district: s.listings.district,
      price: s.listings.price,
      currency: s.listings.currency,
      approvalStatus: s.listings.approvalStatus,
      image: s.listings.coverSrc,
      createdAt: s.listings.createdAt,
      agentName: s.users.name,
    })
    .from(s.listings)
    .leftJoin(s.users, eq(s.listings.agentId, s.users.id))
    .where(isNull(s.listings.deletedAt))
    .orderBy(desc(s.listings.createdAt))
    .limit(500);

  return (
    <ListingsAdminClient
      initial={rows.map((r) => ({
        id: r.id,
        listingNumber: r.listingNumber,
        slug: r.slug,
        title: r.title,
        city: r.city,
        district: r.district,
        price: r.price,
        currency: r.currency,
        approvalStatus: r.approvalStatus,
        image: r.image ?? '',
        agentName: r.agentName ?? '—',
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}

import { getApprovalQueue } from '@/lib/admin-queries';
import { ApprovalsClient } from './ApprovalsClient';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const [pending, approved, rejected] = await Promise.all([
    getApprovalQueue('pending'),
    getApprovalQueue('approved'),
    getApprovalQueue('rejected'),
  ]);
  return (
    <ApprovalsClient
      initialPending={pending.map((r) => ({
        id: r.request.id,
        listingId: r.listing.id,
        slug: r.listing.slug,
        title: r.listing.title,
        image: r.listing.images[0] ?? '',
        city: r.listing.city,
        district: r.listing.district,
        price: r.listing.price,
        currency: r.listing.currency,
        type: r.request.type,
        submittedBy: r.submitter.name,
        submittedAt: r.request.createdAt.toISOString(),
        aiQualityScore: r.request.aiQualityScore,
        aiFlags: r.request.aiFlags,
      }))}
      approvedCount={approved.length}
      rejectedCount={rejected.length}
    />
  );
}

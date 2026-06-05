import { getReviewsForModeration } from '@/lib/office-public-actions';
import { ReviewsModerationClient } from './ReviewsModerationClient';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const [pending, approved, rejected] = await Promise.all([
    getReviewsForModeration('pending'),
    getReviewsForModeration('approved'),
    getReviewsForModeration('rejected'),
  ]);
  return <ReviewsModerationClient pending={pending} approvedCount={approved.length} rejectedCount={rejected.length} />;
}

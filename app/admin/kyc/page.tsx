import { getKycQueue } from '@/lib/admin-queries';
import { KycClient } from './KycClient';

export const dynamic = 'force-dynamic';

export default async function KycPage() {
  const items = await getKycQueue();
  return (
    <KycClient
      initialItems={items.map((r) => ({
        id: r.kyc.id,
        userId: r.user.id,
        userName: r.user.name,
        userEmail: r.user.email,
        userAvatar: r.user.avatar,
        type: r.kyc.type,
        documents: r.kyc.documents,
        status: r.kyc.status,
        aiCheckScore: r.kyc.aiCheckScore,
        aiCheckNotes: r.kyc.aiCheckNotes,
        submittedAt: r.kyc.createdAt.toISOString(),
      }))}
    />
  );
}

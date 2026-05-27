import { PublishersClient } from './PublishersClient';

export const dynamic = 'force-dynamic';

export default async function AdminPublishersPage() {
  const { getPublishers } = await import('@/lib/publisher-actions');
  const publishers = await getPublishers();
  return (
    <PublishersClient
      initial={publishers.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}

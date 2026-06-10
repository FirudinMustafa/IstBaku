import { PublishersClient } from './PublishersClient';

export const dynamic = 'force-dynamic';

export default async function AdminPublishersPage() {
  const { getPublishers, getPublisherApplications } = await import('@/lib/publisher-actions');
  const [publishers, apps] = await Promise.all([getPublishers(), getPublisherApplications()]);
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
      applications={apps.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}

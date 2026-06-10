import { ApplyClient } from './ApplyClient';
import { getMyPublisherApplication } from '@/lib/publisher-actions';

export const dynamic = 'force-dynamic';

export default async function PublisherApplyPage() {
  const me = await getMyPublisherApplication();
  return <ApplyClient role={me.role} status={me.status} />;
}

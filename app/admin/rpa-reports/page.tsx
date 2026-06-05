import { getAdminRpaReports } from '@/lib/rpa-actions';
import { RpaAdminClient } from './RpaAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminRpaReportsPage() {
  const [pending, sent] = await Promise.all([
    getAdminRpaReports('pending'),
    getAdminRpaReports('sent'),
  ]);
  return <RpaAdminClient pending={pending} sentCount={sent.length} />;
}

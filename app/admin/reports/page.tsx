import { getAbuseReports } from '@/lib/admin-queries';
import { AbuseClient } from './AbuseClient';

export const dynamic = 'force-dynamic';

export default async function AbusePage() {
  const items = await getAbuseReports();
  return (
    <AbuseClient
      initial={items.map((r) => ({
        id: r.report.id,
        reporterName: r.reporter.name,
        targetType: r.report.targetType,
        targetId: r.report.targetId,
        reason: r.report.reason,
        details: r.report.details,
        severity: r.report.severity,
        status: r.report.status,
        createdAt: r.report.createdAt.toISOString(),
      }))}
    />
  );
}

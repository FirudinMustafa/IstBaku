import { getAllOfficeMetrics } from '@/lib/office-actions';
import { OfficesClient } from './OfficesClient';

export const dynamic = 'force-dynamic';

export default async function OfficesAdminPage() {
  let rows = [] as Awaited<ReturnType<typeof getAllOfficeMetrics>>;
  try {
    rows = await getAllOfficeMetrics();
  } catch (err) {
    console.error('offices admin page', err);
  }
  // Rütbeye göre sırala: gold → premium → standart, sonra kriter sayısı.
  const order = { gold_partner: 0, premium_office: 1, none: 2 } as const;
  rows.sort((a, b) => order[a.tier] - order[b.tier] || b.criteriaMet.length - a.criteriaMet.length);
  return <OfficesClient rows={rows} />;
}

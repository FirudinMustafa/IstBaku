import { Download, CreditCard, TrendingUp, Receipt } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAllPayments } from '@/lib/admin-queries';
import { formatNumber, timeAgo } from '@/lib/utils';
import dynamicImport from 'next/dynamic';

// MH-23 — defer Recharts to the client.
const PaymentsCharts = dynamicImport(
  () => import('./PaymentsCharts').then((m) => m.PaymentsCharts),
  { loading: () => <div className="h-64 rounded-2xl border bg-[color:var(--bg-elev)] animate-pulse" /> },
);

const TYPE_LABEL: Record<string, string> = {
  tier_upgrade: 'İlan Yükseltme',
  premium_membership: 'Premium Üyelik',
  report_purchase: 'Rapor Satışı',
  partner_commission: 'Partner Komisyonu',
};

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const rows = await getAllPayments();
  const payments = rows.map((r) => ({
    id: r.payment.id,
    user: r.user.name,
    amount: r.payment.amount,
    currency: r.payment.currency,
    type: r.payment.type,
    status: r.payment.status,
    createdAt: r.payment.createdAt.toISOString(),
  }));

  const totalRev = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  const refunded = payments.filter((p) => p.status === 'refunded').reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ödemeler & Gelir</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">Tier yükseltme, premium üyelik, rapor satışı ve partner komisyonları</p>
        </div>
        <Button variant="gold" className="gap-1.5"><Download size={14} /> CSV indir</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardBody className="p-4">
          <CreditCard size={16} className="text-gold-300" />
          <div className="text-xs text-[color:var(--fg-muted)] mt-2">Toplam Gelir</div>
          <div className="text-2xl font-bold mt-0.5 text-gold-300">${formatNumber(totalRev)}</div>
          <div className="text-[10px] text-success mt-1">{payments.filter((p) => p.status === 'paid').length} başarılı ödeme</div>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <Receipt size={16} className="text-navy-300" />
          <div className="text-xs text-[color:var(--fg-muted)] mt-2">İşlem Sayısı</div>
          <div className="text-2xl font-bold mt-0.5">{payments.length}</div>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <TrendingUp size={16} className="text-success" />
          <div className="text-xs text-[color:var(--fg-muted)] mt-2">Ort. İşlem</div>
          <div className="text-2xl font-bold mt-0.5">${payments.length > 0 ? Math.round(totalRev / payments.length) : 0}</div>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <div className="text-xs text-[color:var(--fg-muted)]">İade</div>
          <div className="text-2xl font-bold mt-0.5 text-danger">-${formatNumber(refunded)}</div>
          <div className="text-[10px] text-[color:var(--fg-muted)] mt-1">{payments.filter((p) => p.status === 'refunded').length} iade</div>
        </CardBody></Card>
      </div>

      <PaymentsCharts payments={payments} />

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-wider text-[color:var(--fg-muted)]">
                <th className="px-4 py-3">İşlem ID</th>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-[color:var(--bg-card-hover)]">
                  <td className="px-4 py-3 font-mono text-xs">{p.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{p.user}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{TYPE_LABEL[p.type] ?? p.type}</Badge></td>
                  <td className="px-4 py-3 font-bold">${p.amount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'paid' ? 'success' : p.status === 'refunded' ? 'gold' : 'danger'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--fg-muted)]">{timeAgo(p.createdAt)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-[color:var(--fg-muted)]">Henüz ödeme yok.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

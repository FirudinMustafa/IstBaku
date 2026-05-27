'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardBody } from '@/components/ui/Card';

const TYPE_LABEL: Record<string, string> = {
  tier_upgrade: 'İlan Yükseltme',
  premium_membership: 'Premium Üyelik',
  report_purchase: 'Rapor Satışı',
  partner_commission: 'Partner Komisyonu',
};

const TYPE_COLOR: Record<string, string> = {
  tier_upgrade: '#CAAE99',
  premium_membership: '#6366f1',
  report_purchase: '#10b981',
  partner_commission: '#CAAE99',
};

interface P { id: string; amount: number; type: string; status: string; createdAt: string }

export function PaymentsCharts({ payments }: { payments: P[] }) {
  const byType = Object.entries(
    payments.reduce((acc, p) => {
      if (p.status !== 'paid') return acc;
      acc[p.type] = (acc[p.type] ?? 0) + p.amount;
      return acc;
    }, {} as Record<string, number>),
  ).map(([type, value]) => ({ type: TYPE_LABEL[type] ?? type, value, color: TYPE_COLOR[type] ?? '#6366f1' }));

  // Son 14 gün
  const daily: { d: string; v: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const v = payments
      .filter((p) => p.status === 'paid' && p.createdAt.slice(0, 10) === key)
      .reduce((a, p) => a + p.amount, 0);
    daily.push({ d: `${d.getDate()}/${d.getMonth() + 1}`, v });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4">Günlük Gelir (Son 14 gün)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="var(--fg-muted)" fontSize={10} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke="var(--fg-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="v" fill="#CAAE99" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4">Gelir Kaynağı</h3>
          <div className="h-64">
            {byType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[color:var(--fg-muted)] text-sm">
                Henüz ödeme yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {byType.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

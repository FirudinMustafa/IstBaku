'use client';

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils';

interface Props {
  revTrend: { d: string; v: number }[];
  signupsTrend: { d: string; u: number }[];
  revenueTotal: number;
  totalUsers: number;
  totalListings: number;
}

export function AdminDashboardCharts({ revTrend, signupsTrend, revenueTotal, totalUsers, totalListings }: Props) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Haftalık Gelir</h3>
              <p className="text-xs text-[color:var(--fg-muted)]">Son 7 gün — tüm ödeme türleri</p>
            </div>
            <Badge variant="success" className="gap-1"><TrendingUp size={11} /> ${formatNumber(revenueTotal)}</Badge>
          </div>
          <div className="text-3xl font-bold text-gold-300 mb-2">${formatNumber(revenueTotal)}</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="var(--fg-muted)" fontSize={11} />
                <YAxis stroke="var(--fg-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="v" stroke="#f97316" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold mb-3">Yeni Kayıtlar (7g)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupsTrend}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="var(--fg-muted)" fontSize={11} />
                <YAxis stroke="var(--fg-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="u" fill="#34619a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2.5">
              <div className="text-[color:var(--fg-muted)]">Toplam Kullanıcı</div>
              <div className="font-bold text-lg">{totalUsers}</div>
            </div>
            <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2.5">
              <div className="text-[color:var(--fg-muted)]">İlan</div>
              <div className="font-bold text-lg">{totalListings}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

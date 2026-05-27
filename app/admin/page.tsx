import Link from 'next/link';
import {
  Users, Home, AlertTriangle, ShieldCheck, Activity, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAdminStats, getApprovalQueue, getAuditLog } from '@/lib/admin-queries';
import { db } from '@/db/client';
import { payments, users } from '@/db/schema';
import { sql, gte } from 'drizzle-orm';
import { formatNumber, timeAgo } from '@/lib/utils';
import dynamicImport from 'next/dynamic';

// MH-23 — Recharts (~80 KB gz) is code-split into its own chunk. The chart
// component itself is `'use client'` so it hydrates only on the client.
const AdminDashboardCharts = dynamicImport(
  () => import('./AdminDashboardCharts').then((m) => m.AdminDashboardCharts),
  { loading: () => <div className="h-64 rounded-2xl border bg-[color:var(--bg-elev)] animate-pulse" /> },
);

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const stats = await getAdminStats();
  const pendingApprovals = await getApprovalQueue('pending');
  const recentAudit = await getAuditLog(8);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const recentPayments = await db.select({
    day: sql<string>`to_char(${payments.createdAt}, 'Dy')`,
    total: sql<number>`SUM(${payments.amount})::int`,
  }).from(payments)
    .where(gte(payments.createdAt, sevenDaysAgo))
    .groupBy(sql`to_char(${payments.createdAt}, 'Dy'), date_trunc('day', ${payments.createdAt})`)
    .orderBy(sql`date_trunc('day', ${payments.createdAt})`);

  const recentSignups = await db.select({
    day: sql<string>`to_char(${users.createdAt}, 'Dy')`,
    total: sql<number>`COUNT(*)::int`,
  }).from(users)
    .where(gte(users.createdAt, sevenDaysAgo))
    .groupBy(sql`to_char(${users.createdAt}, 'Dy'), date_trunc('day', ${users.createdAt})`)
    .orderBy(sql`date_trunc('day', ${users.createdAt})`);

  const revTrend = recentPayments.length > 0
    ? recentPayments.map((r) => ({ d: r.day, v: r.total }))
    : [{ d: 'Bugün', v: 0 }];

  const signupsTrend = recentSignups.length > 0
    ? recentSignups.map((r) => ({ d: r.day, u: r.total }))
    : [{ d: 'Bugün', u: 0 }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Genel Bakış</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">Bugün, {new Date().toLocaleDateString('tr-TR', { dateStyle: 'long' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Toplam Kullanıcı', v: stats.users, sub: 'DB toplamı', i: Users, c: 'text-navy-300' },
          { l: 'Aktif İlan', v: stats.listings, sub: `${stats.pendingApproval} onay bekliyor`, i: Home, c: 'text-gold-300' },
          { l: 'Bekleyen KYC', v: stats.pendingKyc, sub: 'Manuel inceleme', i: ShieldCheck, c: 'text-success' },
          { l: 'Açık Şikayet', v: stats.openAbuse, sub: 'Moderasyon kuyruğu', i: AlertTriangle, c: 'text-danger' },
        ].map((stat) => (
          <Card key={stat.l}><CardBody className="p-4">
            <stat.i size={16} className={stat.c} />
            <div className="text-xs text-[color:var(--fg-muted)] mt-2">{stat.l}</div>
            <div className="text-2xl font-bold mt-0.5">{stat.v}</div>
            <div className="text-[10px] text-[color:var(--fg-faint)] mt-1">{stat.sub}</div>
          </CardBody></Card>
        ))}
      </div>

      <AdminDashboardCharts
        revTrend={revTrend}
        signupsTrend={signupsTrend}
        revenueTotal={stats.revenueTotal}
        totalUsers={stats.users}
        totalListings={stats.listings}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Bekleyen Onaylar</h3>
              <Link href="/admin/approvals" className="text-xs text-gold-300 hover:text-gold-400">Tümü →</Link>
            </div>
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-6 text-sm text-[color:var(--fg-muted)]">
                <CheckCircle2 size={20} className="mx-auto text-success mb-1" />
                Bekleyen onay yok
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApprovals.slice(0, 4).map((q) => (
                  <Link
                    key={q.request.id}
                    href="/admin/approvals"
                    className="flex items-center gap-3 p-2.5 rounded-xl border bg-[color:var(--bg-elev)] hover:border-gold-400/60"
                  >
                    {q.listing.images?.[0] && <img src={q.listing.images[0]} alt="" className="size-12 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{q.listing.title}</div>
                      <div className="text-[11px] text-[color:var(--fg-muted)] flex items-center gap-2 mt-0.5">
                        <span>{q.submitter.name}</span>
                        <span>·</span>
                        <span>{timeAgo(q.request.createdAt.toISOString())}</span>
                        {q.request.aiFlags.length > 0 && (
                          <Badge variant="danger" className="!py-0 text-[9px]">{q.request.aiFlags.length} bayrak</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-gold-300">{q.request.aiQualityScore}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Son Denetim Logu</h3>
              <Link href="/admin/audit" className="text-xs text-gold-300 hover:text-gold-400">Tümü →</Link>
            </div>
            {recentAudit.length === 0 ? (
              <div className="text-center py-6 text-sm text-[color:var(--fg-muted)]">Henüz audit kaydı yok.</div>
            ) : (
              <div className="space-y-2">
                {recentAudit.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[color:var(--bg-card-hover)]">
                    <div className="size-7 rounded-full bg-gold-400/15 text-gold-300 flex items-center justify-center shrink-0">
                      <Activity size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{a.action}</span>
                        <span className="text-[color:var(--fg-muted)] text-xs font-mono"> · {a.target.slice(0, 28)}…</span>
                      </div>
                      <div className="text-[11px] text-[color:var(--fg-faint)] mt-0.5">{a.actorEmail ?? 'system'} · {timeAgo(a.createdAt.toISOString())}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="rounded-2xl border border-gold-400/30 bg-gradient-to-br from-navy-700 to-navy-900 p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-gold-300 font-semibold">Hızlı Aksiyon</div>
          <h3 className="text-xl font-bold text-white mt-1">{stats.pendingKyc} KYC + {stats.pendingApproval} ilan onayı bekliyor</h3>
          <p className="text-sm text-navy-200 mt-1">Toplu olarak inceleyip işle.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/kyc"><Button variant="gold">KYC İncele</Button></Link>
          <Link href="/admin/approvals"><Button variant="outline" className="bg-white/5 text-white border-white/20">İlan Onayla</Button></Link>
        </div>
      </div>
    </div>
  );
}

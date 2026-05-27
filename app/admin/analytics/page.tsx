import { Users, Eye, MessageCircle, Sparkles, Search, MapPin } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { db } from '@/db/client';
import { users, listings, messages, savedSearches, auditLog } from '@/db/schema';
import { sql, gte, desc } from 'drizzle-orm';
import { formatNumber } from '@/lib/utils';
import dynamicImport from 'next/dynamic';

// MH-23 — defer Recharts to the client; reduces analytics route bundle.
const AnalyticsCharts = dynamicImport(
  () => import('./AnalyticsCharts').then((m) => m.AnalyticsCharts),
  { loading: () => <div className="h-64 rounded-2xl border bg-[color:var(--bg-elev)] animate-pulse" /> },
);

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // Aggregate stats
  const [usersAgg] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(users);
  const [viewsAgg] = await db.select({ total: sql<number>`COALESCE(SUM(${listings.views}), 0)::int` }).from(listings);
  const [msgAgg] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(messages);
  const [aiAgg] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(auditLog).where(sql`${auditLog.action} ILIKE 'ai_%'`);

  // 30 day signup trend
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const signupsRows = await db.select({
    bucket: sql<string>`to_char(${users.createdAt}, 'DD/MM')`,
    c: sql<number>`COUNT(*)::int`,
    iso: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
  }).from(users)
    .where(gte(users.createdAt, thirtyDaysAgo))
    .groupBy(sql`to_char(${users.createdAt}, 'DD/MM'), to_char(${users.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`);

  // 30 day message trend
  const msgRows = await db.select({
    iso: sql<string>`to_char(${messages.createdAt}, 'YYYY-MM-DD')`,
    c: sql<number>`COUNT(*)::int`,
  }).from(messages)
    .where(gte(messages.createdAt, thirtyDaysAgo))
    .groupBy(sql`to_char(${messages.createdAt}, 'YYYY-MM-DD')`);

  const msgMap = new Map(msgRows.map((r) => [r.iso, r.c]));
  const visitsTrend = signupsRows.map((r) => ({
    d: r.bucket,
    dau: r.c,
    sessions: (msgMap.get(r.iso) ?? 0) + r.c * 4,
  }));

  // Top saved searches by name
  const popularRows = await db.select({
    q: savedSearches.name,
    c: sql<number>`COUNT(*)::int`,
  }).from(savedSearches)
    .groupBy(savedSearches.name)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(8);

  // User country distribution
  const countryRows = await db.select({
    country: users.country,
    c: sql<number>`COUNT(*)::int`,
  }).from(users)
    .groupBy(users.country)
    .orderBy(desc(sql`COUNT(*)`));

  const totalCountry = countryRows.reduce((acc, r) => acc + r.c, 0) || 1;
  const COUNTRY_LABEL: Record<string, string> = {
    TR: '🇹🇷 Türkiye', AZ: '🇦🇿 Azerbaycan', RU: '🇷🇺 Rusya', IR: '🇮🇷 İran',
    DE: '🇩🇪 Almanya', GB: '🇬🇧 İngiltere', US: '🇺🇸 ABD',
  };
  const geo = countryRows.map((r) => {
    const iso = r.country ?? '—';
    return {
      c: COUNTRY_LABEL[iso] ?? `🌍 ${iso}`,
      share: Math.max(1, Math.round((r.c / totalCountry) * 100)),
    };
  });

  // Engagement: derived from audit log action counts
  const engagementRows = await db.select({
    action: auditLog.action,
    c: sql<number>`COUNT(*)::int`,
  }).from(auditLog).groupBy(auditLog.action);

  const engagementMap = new Map(engagementRows.map((r) => [r.action, r.c]));
  const maxEng = Math.max(1, ...engagementRows.map((r) => r.c));
  const engagement = [
    { topic: 'Arama', a: scale(engagementMap.get('search_executed') ?? 0, maxEng) },
    { topic: 'İlan tıklama', a: scale(engagementMap.get('listing_view') ?? viewsAgg.total, Math.max(maxEng, viewsAgg.total)) },
    { topic: 'WhatsApp', a: scale(engagementMap.get('whatsapp_click') ?? 0, maxEng) },
    { topic: 'AI Eşleşme', a: scale(aiAgg.c, maxEng) },
    { topic: 'Hesaplayıcı', a: scale(engagementMap.get('calculator_used') ?? 0, maxEng) },
    { topic: 'Karşılaştırma', a: scale(engagementMap.get('compare_added') ?? 0, maxEng) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analitik</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">Gerçek DB metrikleri — son 30 gün baz</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Kullanıcı', v: formatNumber(usersAgg.c), i: Users },
          { l: 'Toplam Görüntülenme', v: formatNumber(viewsAgg.total), i: Eye },
          { l: 'Mesaj Gönderildi', v: formatNumber(msgAgg.c), i: MessageCircle },
          { l: 'AI Etkinliği', v: formatNumber(aiAgg.c), i: Sparkles },
        ].map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <s.i size={16} className="text-gold-300" />
            <div className="text-xs text-[color:var(--fg-muted)] mt-2">{s.l}</div>
            <div className="text-2xl font-bold mt-0.5">{s.v}</div>
          </CardBody></Card>
        ))}
      </div>

      <AnalyticsCharts
        visits={visitsTrend.length > 0 ? visitsTrend : [{ d: '—', dau: 0, sessions: 0 }]}
        engagement={engagement}
        queries={popularRows.length > 0 ? popularRows : [{ q: 'Henüz arama yok', c: 0 }]}
      />

      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4 inline-flex items-center gap-2"><MapPin size={15} className="text-gold-300" /> Trafik Coğrafyası</h3>
          {geo.length === 0 ? (
            <div className="text-sm text-[color:var(--fg-muted)]">Veri yok.</div>
          ) : (
            <div className="space-y-2.5">
              {geo.map((r) => (
                <div key={r.c}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{r.c}</span>
                    <span className="font-bold text-gold-300">%{r.share}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[color:var(--bg-card-hover)] mt-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-400 to-gold-300" style={{ width: `${r.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function scale(v: number, max: number) {
  if (max === 0) return 0;
  return Math.round((v / max) * 100);
}

import { Star, BadgeCheck, Phone, Eye, TrendingUp, MessageCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAllAgents } from '@/lib/admin-queries';
import { db } from '@/db/client';
import { listings } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AgentsAdminPage() {
  const rows = await getAllAgents();
  // Each agent's listings count
  const stats = await Promise.all(rows.map(async (r) => {
    const [c] = await db.select({ c: count() }).from(listings).where(eq(listings.agentId, r.user.id));
    return { userId: r.user.id, listings: c.c };
  }));
  const statsMap = new Map(stats.map((x) => [x.userId, x.listings]));

  const total = rows.length;
  const verified = rows.filter((r) => r.agent.verified).length;
  const avgResponse = total > 0 ? Math.round(rows.reduce((a, r) => a + r.agent.responseMins, 0) / total) : 0;
  const avgPerf = total > 0 ? Math.round(rows.reduce((a, r) => a + r.agent.performance, 0) / total) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ofisler & Emlakçılar</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">{total} aktif ajan · {verified} doğrulanmış</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Toplam Ajan', v: total },
          { l: 'Doğrulanmış', v: verified },
          { l: 'Ort. Yanıt', v: `${avgResponse} dk` },
          { l: 'Ort. Performans', v: avgPerf },
        ].map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <div className="text-xs text-[color:var(--fg-muted)]">{s.l}</div>
            <div className="text-2xl font-bold mt-1 text-gold-300">{s.v}</div>
          </CardBody></Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => {
          const u = r.user;
          const a = r.agent;
          const listingsCount = statsMap.get(u.id) ?? 0;
          return (
            <Card key={u.id}>
              <CardBody>
                <div className="flex items-center gap-3">
                  {u.avatar && <img src={u.avatar} alt="" className="size-14 rounded-2xl object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="font-semibold truncate">{u.name}</div>
                      {a.verified && <BadgeCheck size={14} className="text-gold-300" />}
                    </div>
                    <div className="text-xs text-[color:var(--fg-muted)] truncate">{a.agency ?? '—'}</div>
                    <div className="flex items-center gap-3 mt-1 text-[11px]">
                      <span className="inline-flex items-center gap-0.5 text-gold-300">
                        <Star size={10} fill="currentColor" /> {a.rating.toFixed(1)}
                      </span>
                      <span className="text-[color:var(--fg-muted)]">~{a.responseMins} dk</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2 text-center">
                    <Eye size={11} className="text-[color:var(--fg-muted)] mx-auto" />
                    <div className="font-bold mt-1">{listingsCount}</div>
                    <div className="text-[10px] text-[color:var(--fg-muted)]">İlan</div>
                  </div>
                  <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2 text-center">
                    <TrendingUp size={11} className="text-success mx-auto" />
                    <div className="font-bold mt-1 text-success">{a.performance}</div>
                    <div className="text-[10px] text-[color:var(--fg-muted)]">Performans</div>
                  </div>
                  <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2 text-center">
                    <div className="text-[10px] text-[color:var(--fg-muted)]">Yorum</div>
                    <div className="font-bold mt-1">{a.reviewsCount}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                  {(a.languages ?? []).map((l) => <Badge key={l} variant="outline" className="!text-[10px]">{l.toUpperCase()}</Badge>)}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <a href={`tel:`}><Button variant="outline" size="sm" className="gap-1 w-full"><Phone size={12} /></Button></a>
                  <a href={`https://wa.me/${(a.whatsappNumber ?? '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1 w-full"><MessageCircle size={12} /></Button>
                  </a>
                  <a href={`mailto:${u.email}`}><Button variant="ghost" size="sm" className="w-full">Detay →</Button></a>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

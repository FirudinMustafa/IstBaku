import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users, MessageCircle, TrendingUp, Calendar, Star, Eye, Heart, BadgeCheck,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getCurrentUser } from '@/lib/auth-actions';
import { db } from '@/db/client';
import { listings, appointments, messageThreads, agents, users } from '@/db/schema';
import { eq, and, desc, gte, or, count, sql } from 'drizzle-orm';
import { rowToProperty } from '@/lib/db-mappers';
import { formatPrice } from '@/lib/currency';
import { timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { l: string; v: 'default' | 'success' | 'gold' | 'danger' }> = {
  confirmed: { l: 'Onaylandı', v: 'gold' },
  pending: { l: 'Bekliyor', v: 'default' },
  cancelled: { l: 'İptal', v: 'danger' },
  completed: { l: 'Tamamlandı', v: 'success' },
};

export default async function AgentCRMPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/auth/sign-in?next=/agent');
  if (me.role !== 'agent' && me.role !== 'admin' && me.role !== 'super_admin') {
    redirect('/dashboard');
  }

  // Agent kayıt + listings
  const [agentRow] = await db.select().from(agents).where(eq(agents.userId, me.id)).limit(1);
  const myListingsRows = await db.select().from(listings)
    .where(eq(listings.agentId, me.id))
    .orderBy(desc(listings.publishedAt));
  const myListings = myListingsRows.map(rowToProperty);

  // Lead'ler = randevular (ziyaretçi formundan gelenler)
  const now = new Date();
  const past14 = new Date(Date.now() - 14 * 86400000);
  const leadRows = await db.select({
    appt: appointments,
    listing: listings,
  })
    .from(appointments)
    .leftJoin(listings, eq(appointments.listingId, listings.id))
    .where(and(
      eq(appointments.agentId, me.id),
      gte(appointments.createdAt, past14),
    ))
    .orderBy(desc(appointments.createdAt))
    .limit(8);

  // Bu hafta görüşme
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [thisWeekMeetings] = await db.select({ c: count() })
    .from(appointments)
    .where(and(eq(appointments.agentId, me.id), gte(appointments.scheduledAt, weekAgo)));

  // Aktif lead = bekleyen veya gelecek randevular
  const [activeLeads] = await db.select({ c: count() })
    .from(appointments)
    .where(and(eq(appointments.agentId, me.id), gte(appointments.scheduledAt, now)));

  // Mesaj eşikleri — bana açılan thread sayısı
  const [openThreads] = await db.select({ c: count() })
    .from(messageThreads)
    .where(or(eq(messageThreads.participantA, me.id), eq(messageThreads.participantB, me.id)));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <img src={me.avatar ?? ''} alt="" className="size-16 rounded-2xl object-cover bg-gold-400/20" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-bold">{me.name}</h1>
              {agentRow?.verified && <BadgeCheck size={18} className="text-gold-300" />}
            </div>
            <div className="text-sm text-[color:var(--fg-muted)]">{agentRow?.agency ?? me.email}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[color:var(--fg-muted)]">
              {agentRow && (
                <>
                  <span className="inline-flex items-center gap-1 text-gold-300"><Star size={11} fill="currentColor" /> {agentRow.rating.toFixed(1)}</span>
                  <span>Performans <strong className="text-gold-300">{agentRow.performance}/100</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
        <Link href="/new-listing"><Button variant="gold">+ Yeni İlan</Button></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { l: 'Aktif Lead', v: String(activeLeads.c), i: Users },
          { l: 'Bu Hafta Görüşme', v: String(thisWeekMeetings.c), i: Calendar },
          { l: 'Aktif İlan', v: String(myListings.length), i: Eye },
          { l: 'Açık Konuşma', v: String(openThreads.c), i: MessageCircle },
        ].map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <s.i size={16} className="text-gold-300" />
            <div className="text-xs text-[color:var(--fg-muted)] mt-2">{s.l}</div>
            <div className="text-2xl font-bold mt-0.5">{s.v}</div>
          </CardBody></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Son Lead'ler (14 gün)</h3>
              <Badge variant="outline">{leadRows.length} randevu</Badge>
            </div>
            {leadRows.length === 0 ? (
              <div className="text-center py-10 text-sm text-[color:var(--fg-muted)]">
                Son 14 günde randevu yok.
              </div>
            ) : (
              <div className="space-y-2">
                {leadRows.map((row) => {
                  const a = row.appt;
                  const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.confirmed;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border bg-[color:var(--bg-elev)]">
                      <div className="size-10 rounded-full bg-gold-400/15 text-gold-300 flex items-center justify-center font-bold">
                        {a.visitorName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium">{a.visitorName}</div>
                          <Badge variant={st.v}>{st.l}</Badge>
                        </div>
                        <div className="text-xs text-[color:var(--fg-muted)] truncate">
                          {row.listing?.title ?? '—'}
                        </div>
                        <div className="text-[10px] text-[color:var(--fg-faint)] mt-0.5">
                          {new Date(a.scheduledAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                          {' · '}{timeAgo(a.createdAt.toISOString())}
                        </div>
                      </div>
                      <a href={`mailto:${a.visitorEmail}`}>
                        <Button variant="outline" size="sm" className="gap-1"><MessageCircle size={13} /></Button>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold mb-4">İlanlarım</h3>
            {myListings.length === 0 ? (
              <div className="text-center py-6 text-sm text-[color:var(--fg-muted)]">
                Henüz ilan yok. <Link href="/new-listing" className="text-gold-300 hover:underline">Yeni ilan yükle</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.slice(0, 8).map((p) => (
                  <Link key={p.id} href={`/property/${p.slug}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[color:var(--bg-card-hover)]">
                    <img src={p.images[0]} alt="" className="size-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-[10px] text-[color:var(--fg-muted)] flex items-center gap-2 mt-0.5">
                        <span><Eye size={9} className="inline" /> {p.views.toLocaleString('tr-TR')}</span>
                        <span><Heart size={9} className="inline" /> {p.favorites}</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-gold-300">{formatPrice(p.price, p.currency)}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

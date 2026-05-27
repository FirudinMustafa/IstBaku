'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Ban, Eye } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { timeAgo, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { resolveAbuseAction } from '@/lib/admin-actions';

const REASON_LABEL: Record<string, string> = {
  fake: 'Sahte ilan', spam: 'Spam', scam: 'Dolandırıcılık',
  inappropriate: 'Uygunsuz içerik', duplicate: 'Duplikat', wrong_info: 'Yanlış bilgi',
};

const SEVERITY: Record<string, { l: string; v: 'danger' | 'gold' | 'default' }> = {
  high: { l: 'Yüksek', v: 'danger' },
  medium: { l: 'Orta', v: 'gold' },
  low: { l: 'Düşük', v: 'default' },
};

interface Item {
  id: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
}

export function AbuseClient({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>(initial);
  const [tab, setTab] = React.useState<Item['status'] | 'all'>('all');
  const [working, setWorking] = React.useState<string | null>(null);

  const filtered = items.filter((r) => tab === 'all' || r.status === tab);

  async function act(id: string, status: 'resolved' | 'dismissed' | 'reviewing') {
    setWorking(id);
    const res = await resolveAbuseAction(id, status);
    setWorking(null);
    if (res.ok) {
      setItems((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
      toast({ variant: 'success', title: 'Şikayet güncellendi', description: `Durum: ${status}` });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Şikayetler & İçerik Moderasyonu</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">Kullanıcı şikayetleri ve otomatik AI bayrakları.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Yüksek Önem', v: items.filter((r) => r.severity === 'high').length, c: 'text-danger' },
          { l: 'Açık', v: items.filter((r) => r.status === 'open').length, c: 'text-gold-300' },
          { l: 'İnceleniyor', v: items.filter((r) => r.status === 'reviewing').length, c: 'text-navy-300' },
          { l: 'Çözüldü', v: items.filter((r) => r.status === 'resolved').length, c: 'text-success' },
        ].map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <div className="text-xs text-[color:var(--fg-muted)]">{s.l}</div>
            <div className={cn('text-2xl font-bold mt-1', s.c)}>{s.v}</div>
          </CardBody></Card>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-[color:var(--bg-elev)] border w-fit overflow-x-auto">
        {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('h-9 px-4 rounded-lg text-sm font-medium whitespace-nowrap',
              tab === t ? 'bg-gold-400 text-navy-900' : 'text-[color:var(--fg-muted)]',
            )}
          >
            {t === 'all' ? 'Hepsi' : t === 'open' ? 'Açık' : t === 'reviewing' ? 'İnceleniyor' : t === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
            <AlertTriangle size={28} className="mx-auto text-success" />
            <p className="mt-2">Bu kategoride şikayet yok.</p>
          </CardBody></Card>
        )}
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardBody>
              <div className="flex items-start gap-4 flex-wrap">
                <div className={cn('size-10 rounded-full flex items-center justify-center shrink-0',
                  r.severity === 'high' && 'bg-danger/15 text-danger',
                  r.severity === 'medium' && 'bg-gold-400/15 text-gold-300',
                  r.severity === 'low' && 'bg-navy-500/15 text-navy-300',
                )}>
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SEVERITY[r.severity].v}>{SEVERITY[r.severity].l}</Badge>
                    <Badge variant="ai">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                    <Badge variant="outline">{r.targetType}</Badge>
                    <span className="text-[11px] text-[color:var(--fg-muted)]">{timeAgo(r.createdAt)}</span>
                  </div>
                  <div className="mt-2 font-medium text-sm">
                    {r.reporterName} <span className="text-[color:var(--fg-muted)] font-normal">şu hedefi şikayet etti:</span>{' '}
                    <code className="text-gold-300 text-xs">{r.targetId.slice(0, 12)}…</code>
                  </div>
                  <p className="text-sm text-[color:var(--fg-muted)] mt-1 italic">"{r.details}"</p>
                </div>
                <div className="flex sm:flex-col gap-1.5 items-end">
                  <Button variant="outline" size="sm" className="gap-1"><Eye size={12} /> Aç</Button>
                  {r.status === 'open' && (
                    <Button variant="ghost" size="sm" onClick={() => act(r.id, 'reviewing')} loading={working === r.id}>İncele</Button>
                  )}
                  {r.status !== 'resolved' && (
                    <Button variant="gold" size="sm" className="gap-1" onClick={() => act(r.id, 'resolved')} loading={working === r.id}>
                      <Check size={12} /> Çöz
                    </Button>
                  )}
                  {r.severity === 'high' && r.status !== 'dismissed' && (
                    <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10 gap-1" onClick={() => act(r.id, 'dismissed')}>
                      <Ban size={12} /> Kapat
                    </Button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X, Eye, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/currency';
import { timeAgo, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { approveListingAction, rejectListingAction } from '@/lib/admin-actions';

const TYPE_LABEL: Record<string, string> = {
  new_listing: 'Yeni İlan',
  price_change: 'Fiyat Değişikliği',
  photo_update: 'Foto Güncelleme',
  tier_upgrade: 'Seviye Yükseltme',
};

const FLAG_LABEL: Record<string, { l: string; v: 'danger' | 'gold' }> = {
  'duplicate-suspect': { l: 'Duplikat şüphesi', v: 'danger' },
  'low-quality-photos': { l: 'Düşük foto kalitesi', v: 'gold' },
  'price-outlier': { l: 'Fiyat aykırı', v: 'danger' },
};

interface QueueItem {
  id: string;
  listingId: string;
  slug: string;
  title: string;
  image: string;
  city: string;
  district: string;
  price: number;
  currency: 'USD' | 'EUR' | 'TRY' | 'AZN';
  type: string;
  submittedBy: string;
  submittedAt: string;
  aiQualityScore: number;
  aiFlags: string[];
}

export function ApprovalsClient({
  initialPending,
  approvedCount,
  rejectedCount,
}: {
  initialPending: QueueItem[];
  approvedCount: number;
  rejectedCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<'pending' | 'approved' | 'rejected'>('pending');
  const [pending, setPending] = React.useState<QueueItem[]>(initialPending);
  const [working, setWorking] = React.useState<string | null>(null);

  async function approve(item: QueueItem) {
    setWorking(item.id);
    const res = await approveListingAction(item.listingId, 2);
    setWorking(null);
    if (res.ok) {
      setPending((cur) => cur.filter((x) => x.id !== item.id));
      toast({ variant: 'success', title: 'İlan onaylandı', description: `${item.title} artık ISTBAKU Onaylı.` });
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Onaylanamadı' });
    }
  }

  async function reject(item: QueueItem) {
    setWorking(item.id);
    const res = await rejectListingAction(item.listingId, 'Admin tarafından reddedildi');
    setWorking(null);
    if (res.ok) {
      setPending((cur) => cur.filter((x) => x.id !== item.id));
      toast({ variant: 'info', title: 'İlan reddedildi' });
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Reddedilemedi' });
    }
  }

  const visible = tab === 'pending' ? pending : [];
  const counts = { pending: pending.length, approved: approvedCount, rejected: rejectedCount };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">İlan Onay Kuyruğu</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">AI tarafından ön taranmış başvurular. Onay verince ilan ISTBAKU Onaylı rozetini alır.</p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-[color:var(--bg-elev)] border w-fit">
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-9 px-4 rounded-lg text-sm font-medium',
              tab === t ? 'bg-gold-400 text-navy-900' : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
            )}
          >
            {t === 'pending' ? 'Bekleyen' : t === 'approved' ? 'Onaylı' : 'Reddedildi'}
            <span className="ml-2 opacity-70">({counts[t]})</span>
          </button>
        ))}
      </div>

      {tab !== 'pending' && (
        <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
          <ShieldCheck size={28} className="mx-auto text-success" />
          <p className="mt-2">Bu sekmedeki kayıtlar audit log'da görüntülenebilir.</p>
        </CardBody></Card>
      )}

      <div className="space-y-3">
        {visible.map((q) => (
          <Card key={q.id} className="overflow-hidden">
            <div className="grid sm:grid-cols-[200px_1fr_auto] gap-0">
              <img src={q.image} alt="" className="w-full h-44 sm:h-full object-cover" />
              <div className="p-5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="ai">{TYPE_LABEL[q.type] ?? q.type}</Badge>
                  <span className="text-xs text-[color:var(--fg-muted)]">{q.submittedBy} · {timeAgo(q.submittedAt)}</span>
                </div>
                <Link href={`/property/${q.slug}`} className="block mt-2 font-semibold hover:text-gold-300">{q.title}</Link>
                <div className="text-xs text-[color:var(--fg-muted)] mt-1">{q.city} / {q.district} · {formatPrice(q.price, q.currency)}</div>

                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--bg-elev)] border px-3 py-1.5">
                    <Sparkles size={12} className="text-gold-300" />
                    <span className="text-xs">AI Kalite</span>
                    <span className={cn('font-bold text-sm', q.aiQualityScore >= 80 ? 'text-success' : 'text-gold-300')}>{q.aiQualityScore}/100</span>
                  </div>
                  {q.aiFlags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <ShieldCheck size={13} /> Tüm kontroller geçti
                    </span>
                  ) : (
                    q.aiFlags.map((f) => (
                      <Badge key={f} variant={FLAG_LABEL[f]?.v ?? 'gold'}>
                        <AlertTriangle size={11} /> {FLAG_LABEL[f]?.l ?? f}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="p-5 sm:border-l flex sm:flex-col gap-2 items-center justify-center bg-[color:var(--bg-elev)]/40">
                <Link href={`/property/${q.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-1.5"><Eye size={13} /> İlanı Aç</Button>
                </Link>
                <Button variant="gold" size="sm" className="gap-1.5" loading={working === q.id} onClick={() => approve(q)}>
                  <Check size={13} /> Onayla
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-danger hover:bg-danger/10" loading={working === q.id} onClick={() => reject(q)}>
                  <X size={13} /> Reddet
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {tab === 'pending' && pending.length === 0 && (
          <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
            <ShieldCheck size={28} className="mx-auto text-success" />
            <p className="mt-2">Bekleyen ilan yok 🎉</p>
          </CardBody></Card>
        )}
      </div>
    </div>
  );
}

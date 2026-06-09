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
import { useLang } from '@/components/layout/LangProvider';
import { approveListingAction, rejectListingAction } from '@/lib/admin-actions';

const TYPE_LABEL_KEY: Record<string, string> = {
  new_listing: 'approvals.type.new_listing',
  price_change: 'approvals.type.price_change',
  photo_update: 'approvals.type.photo_update',
  tier_upgrade: 'approvals.type.tier_upgrade',
};

const FLAG_LABEL: Record<string, { k: string; v: 'danger' | 'gold' }> = {
  'duplicate-suspect': { k: 'approvals.flag.duplicate', v: 'danger' },
  'low-quality-photos': { k: 'approvals.flag.lowQuality', v: 'gold' },
  'price-outlier': { k: 'approvals.flag.priceOutlier', v: 'danger' },
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
  const { t } = useLang();
  const [tab, setTab] = React.useState<'pending' | 'approved' | 'rejected'>('pending');
  const [pending, setPending] = React.useState<QueueItem[]>(initialPending);
  const [working, setWorking] = React.useState<string | null>(null);

  async function approve(item: QueueItem) {
    setWorking(item.id);
    // Madde 4 fix: talebe-özel onay (request.id). Rozet ve yayın onayı bağımsız.
    const res = await approveListingAction(item.id, 2);
    setWorking(null);
    if (res.ok) {
      setPending((cur) => cur.filter((x) => x.id !== item.id));
      const isBadge = item.type === 'tier_upgrade';
      toast({
        variant: 'success',
        title: isBadge ? t('approvals.toast.badgeApproved') : t('approvals.toast.listingApproved'),
        description: isBadge ? `${item.title} ${t('approvals.toast.badgeApprovedDesc')}` : `${item.title} ${t('approvals.toast.listingApprovedDesc')}`,
      });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('approvals.toast.approveFail'), description: res.error });
    }
  }

  async function reject(item: QueueItem) {
    setWorking(item.id);
    const res = await rejectListingAction(item.id, t('approvals.rejectReason'));
    setWorking(null);
    if (res.ok) {
      setPending((cur) => cur.filter((x) => x.id !== item.id));
      const isBadge = item.type === 'tier_upgrade';
      toast({ variant: 'info', title: isBadge ? t('approvals.toast.badgeRejected') : t('approvals.toast.listingRejected') });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('approvals.toast.rejectFail'), description: res.error });
    }
  }

  const visible = tab === 'pending' ? pending : [];
  const counts = { pending: pending.length, approved: approvedCount, rejected: rejectedCount };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('approvals.heading')}</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">{t('approvals.desc')} <strong>{t('approvals.desc.newListing')}</strong> {t('approvals.desc.mid')} <strong>{t('approvals.desc.tier')}</strong> {t('approvals.desc.end')}</p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-[color:var(--bg-elev)] border max-w-full overflow-x-auto">
        {(['pending', 'approved', 'rejected'] as const).map((tt) => (
          <button
            key={tt}
            onClick={() => setTab(tt)}
            className={cn(
              'h-9 px-4 rounded-lg text-sm font-medium',
              tab === tt ? 'bg-gold-400 text-navy-900' : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
            )}
          >
            {tt === 'pending' ? t('approvals.tab.pending') : tt === 'approved' ? t('approvals.tab.approved') : t('approvals.tab.rejected')}
            <span className="ml-2 opacity-70">({counts[tt]})</span>
          </button>
        ))}
      </div>

      {tab !== 'pending' && (
        <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
          <ShieldCheck size={28} className="mx-auto text-success" />
          <p className="mt-2">{t('approvals.auditNote')}</p>
        </CardBody></Card>
      )}

      <div className="space-y-3">
        {visible.map((q) => (
          <Card key={q.id} className="overflow-hidden">
            <div className="grid sm:grid-cols-[200px_1fr_auto] gap-0">
              <img src={q.image} alt="" className="w-full h-44 sm:h-full object-cover" />
              <div className="p-5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="ai">{TYPE_LABEL_KEY[q.type] ? t(TYPE_LABEL_KEY[q.type]) : q.type}</Badge>
                  <span className="text-xs text-[color:var(--fg-muted)]">{q.submittedBy} · {timeAgo(q.submittedAt)}</span>
                </div>
                <Link href={`/property/${q.slug}`} className="block mt-2 font-semibold hover:text-gold-300">{q.title}</Link>
                <div className="text-xs text-[color:var(--fg-muted)] mt-1">{q.city} / {q.district} · {formatPrice(q.price, q.currency)}</div>

                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--bg-elev)] border px-3 py-1.5">
                    <Sparkles size={12} className="text-gold-300" />
                    <span className="text-xs">{t('approvals.aiQuality')}</span>
                    <span className={cn('font-bold text-sm', q.aiQualityScore >= 80 ? 'text-success' : 'text-gold-300')}>{q.aiQualityScore}/100</span>
                  </div>
                  {q.aiFlags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <ShieldCheck size={13} /> {t('approvals.allPassed')}
                    </span>
                  ) : (
                    q.aiFlags.map((f) => (
                      <Badge key={f} variant={FLAG_LABEL[f]?.v ?? 'gold'}>
                        <AlertTriangle size={11} /> {FLAG_LABEL[f] ? t(FLAG_LABEL[f].k) : f}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="p-5 sm:border-l flex sm:flex-col gap-2 items-center justify-center bg-[color:var(--bg-elev)]/40">
                <Link href={`/property/${q.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-1.5"><Eye size={13} /> {t('approvals.btn.open')}</Button>
                </Link>
                <Button variant="gold" size="sm" className="gap-1.5" loading={working === q.id} onClick={() => approve(q)}>
                  <Check size={13} /> {t('approvals.btn.approve')}
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-danger hover:bg-danger/10" loading={working === q.id} onClick={() => reject(q)}>
                  <X size={13} /> {t('approvals.btn.reject')}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {tab === 'pending' && pending.length === 0 && (
          <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
            <ShieldCheck size={28} className="mx-auto text-success" />
            <p className="mt-2">{t('approvals.empty')}</p>
          </CardBody></Card>
        )}
      </div>
    </div>
  );
}

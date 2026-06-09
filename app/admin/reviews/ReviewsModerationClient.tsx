'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Check, X, MessageSquare } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { moderateReviewAction, type ModerationReview } from '@/lib/office-public-actions';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} className={value >= n ? 'text-gold-300' : 'text-[color:var(--border-strong)]'} fill={value >= n ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export function ReviewsModerationClient({
  pending, approvedCount, rejectedCount,
}: { pending: ModerationReview[]; approvedCount: number; rejectedCount: number }) {
  const router = useRouter();
  const { t } = useLang();
  const { toast } = useToast();
  const [rows, setRows] = React.useState<ModerationReview[]>(pending);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusy(id);
    const res = await moderateReviewAction(id, decision);
    setBusy(null);
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ variant: 'success', title: decision === 'approved' ? t('admin.reviews.toast.approved') : t('admin.reviews.toast.rejected') });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('admin.reviews.toast.fail'), description: res.error });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><MessageSquare size={20} className="text-gold-300" /> {t('admin.reviews.title')}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="gold">{t('admin.reviews.pending').replace('{n}', String(rows.length))}</Badge>
          <Badge variant="success">{t('admin.reviews.approved').replace('{n}', String(approvedCount))}</Badge>
          <Badge variant="danger">{t('admin.reviews.rejected').replace('{n}', String(rejectedCount))}</Badge>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">{t('admin.reviews.empty')}</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-sm font-medium">{r.authorName}</span>
                    <span className="text-xs text-[color:var(--fg-muted)]">→</span>
                    <Link href={`/office/${r.agentUserId}`} target="_blank" className="text-sm text-gold-300 hover:underline">{r.officeName}</Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => decide(r.id, 'rejected')} loading={busy === r.id}>
                      <X size={14} /> {t('admin.reviews.reject')}
                    </Button>
                    <Button variant="gold" size="sm" onClick={() => decide(r.id, 'approved')} loading={busy === r.id}>
                      <Check size={14} /> {t('admin.reviews.approve')}
                    </Button>
                  </div>
                </div>
                {r.text && <p className="text-sm text-[color:var(--fg-muted)] leading-relaxed">{r.text}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

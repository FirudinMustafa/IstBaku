'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Check, X, MessageSquare } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
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
  const { toast } = useToast();
  const [rows, setRows] = React.useState<ModerationReview[]>(pending);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusy(id);
    const res = await moderateReviewAction(id, decision);
    setBusy(null);
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ variant: 'success', title: decision === 'approved' ? 'Yorum onaylandı' : 'Yorum reddedildi' });
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'İşlem başarısız', description: res.error });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><MessageSquare size={20} className="text-gold-300" /> Yorum Moderasyonu</h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="gold">{rows.length} bekliyor</Badge>
          <Badge variant="success">{approvedCount} onaylı</Badge>
          <Badge variant="danger">{rejectedCount} reddedildi</Badge>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">Bekleyen yorum yok.</CardBody></Card>
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
                      <X size={14} /> Reddet
                    </Button>
                    <Button variant="gold" size="sm" onClick={() => decide(r.id, 'approved')} loading={busy === r.id}>
                      <Check size={14} /> Onayla
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

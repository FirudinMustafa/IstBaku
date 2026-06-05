'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { submitReviewAction } from '@/lib/office-public-actions';

export function OfficeReviewForm({ agentUserId }: { agentUserId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);

  async function submit() {
    if (rating < 1) {
      toast({ variant: 'error', title: t('office.review.pickRating') });
      return;
    }
    setSending(true);
    const res = await submitReviewAction({ agentUserId, rating, text });
    setSending(false);
    if (!res.ok) {
      toast({ variant: 'error', title: t('office.review.failed'), description: res.error });
      return;
    }
    setRating(0); setText('');
    toast({ variant: 'success', title: t('office.review.sent'), description: t('office.review.sentDesc') });
    router.refresh();
  }

  return (
    <div className="rounded-2xl border bg-[color:var(--bg-card)] p-4 space-y-3">
      <h3 className="font-semibold">{t('office.review.title')}</h3>
      <div className="flex items-center gap-1" role="group" aria-label={t('office.review.pickRating')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`${n}`}
            className="p-0.5"
          >
            <Star
              size={26}
              className={(hover || rating) >= n ? 'text-gold-300' : 'text-[color:var(--border-strong)]'}
              fill={(hover || rating) >= n ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      <Textarea
        id="office-review"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        placeholder={t('office.review.placeholder')}
      />
      <Button variant="gold" onClick={submit} loading={sending}>{t('office.review.submit')}</Button>
      <p className="text-[11px] text-[color:var(--fg-faint)]">{t('office.review.moderationNote')}</p>
    </div>
  );
}

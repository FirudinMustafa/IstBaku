'use client';

import * as React from 'react';
import { Lock, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { requestPrivateAccessAction } from '@/lib/private-access-actions';

/**
 * Gizli portföy erişim talep ekranı (Tur6 #4c). KYC onaylı ama erişimi olmayan
 * kullanıcıya gösterilir. requested → bekleme; none/rejected → talep butonu.
 */
export function PrivateAccessRequest({ status }: { status: string }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [requested, setRequested] = React.useState(status === 'requested');

  async function request() {
    setBusy(true);
    const res = await requestPrivateAccessAction();
    setBusy(false);
    if (res.ok) { setRequested(true); toast({ variant: 'success', title: t('portfolio.access.requested') }); }
    else toast({ variant: 'error', title: t('common.error'), description: res.error });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gold-400/15 text-gold-300 mb-5">
        {requested ? <Clock size={30} /> : <Lock size={30} />}
      </div>
      <h1 className="text-2xl font-semibold">{t('portfolio.access.title')}</h1>
      <p className="mt-3 text-[color:var(--fg-muted)]">
        {requested ? t('portfolio.access.pendingBody') : t('portfolio.access.body')}
      </p>
      {status === 'rejected' && !requested && (
        <p className="mt-2 text-sm text-danger">{t('portfolio.access.rejected')}</p>
      )}
      <ul className="mt-6 text-left text-sm text-[color:var(--fg-muted)] space-y-2 max-w-sm mx-auto">
        <li className="flex items-start gap-2"><ShieldCheck size={16} className="text-success mt-0.5 shrink-0" /> {t('portfolio.access.point1')}</li>
        <li className="flex items-start gap-2"><ShieldCheck size={16} className="text-success mt-0.5 shrink-0" /> {t('portfolio.access.point2')}</li>
      </ul>
      {!requested && (
        <Button variant="gold" size="lg" className="mt-7" onClick={request} loading={busy}>
          {t('portfolio.access.requestBtn')}
        </Button>
      )}
    </div>
  );
}

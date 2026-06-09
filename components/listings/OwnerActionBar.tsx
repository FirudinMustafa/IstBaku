'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { PaymentModal, type PendingPayment } from '@/components/payments/PaymentModal';
import { renewListingDateAction, requestPremiumUpgradeAction, convertToPrivateAction } from '@/lib/listing-owner-actions';
import { useCurrency } from '@/lib/currency-store';
import { formatUsdCents } from '@/lib/currency';

interface Props {
  listingId: string;
  currentTier: string;
  isApproved: boolean;
  isPrivate: boolean;
  price: number;
  userKycStatus: string;
  /** Admin'den ayarlanabilir fiyatlar (USD cent). */
  prices: { renewal: number; badge: number };
}

export function OwnerActionBar({ listingId, currentTier, isApproved, isPrivate, price, userKycStatus, prices }: Props) {
  const { toast } = useToast();
  const { t } = useLang();
  const router = useRouter();
  const { currency } = useCurrency();
  // Admin fiyatları USD cent — kullanıcının seçtiği para biriminde göster.
  const fee = (cents: number) => formatUsdCents(cents, currency);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingPayment | null>(null);
  // Ödeme başarıyla onaylanınca gösterilecek mesaj.
  const successRef = React.useRef<{ title: string; description: string } | null>(null);

  async function startRenew() {
    setLoading('renew');
    const res = await renewListingDateAction(listingId);
    setLoading(null);
    if (!res.ok) { toast({ variant: 'error', title: t('common.error'), description: res.error }); return; }
    successRef.current = { title: t('pay.dateRenewed.title'), description: t('pay.dateRenewed.desc') };
    setPending({ paymentId: res.paymentId, amount: res.amount, currency: res.currency, checkoutUrl: res.checkoutUrl, title: t('pay.renew.title'), description: t('pay.renew.desc') });
  }

  async function startPremium() {
    setLoading('premium');
    const res = await requestPremiumUpgradeAction(listingId);
    setLoading(null);
    if (!res.ok) { toast({ variant: 'error', title: t('common.error'), description: res.error }); return; }
    successRef.current = { title: t('pay.approved.title'), description: t('pay.approvedPremium.desc') };
    setPending({ paymentId: res.paymentId, amount: res.amount, currency: res.currency, checkoutUrl: res.checkoutUrl, title: t('pay.badge.title'), description: t('pay.badge.desc') });
  }

  async function handlePrivate() {
    setLoading('private');
    const res = await convertToPrivateAction(listingId);
    setLoading(null);
    if (res.ok) { toast({ variant: 'success', title: t('owner.privateAdded.title'), description: t('owner.privateAdded.desc') }); router.refresh(); }
    else toast({ variant: 'error', title: t('common.error'), description: res.error });
  }

  async function onPaid() {
    const msg = successRef.current;
    setPending(null);
    if (msg) toast({ variant: 'success', title: msg.title, description: msg.description });
    router.refresh();
  }

  return (
    <Card glass>
      <CardBody className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[color:var(--fg-muted)]">{t('owner.manage')}</h3>

        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={startRenew} disabled={loading !== null}>
          {loading === 'renew' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {t('dash.ml.renew')} ({fee(prices.renewal)})
        </Button>

        {!isApproved ? (
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={startPremium} disabled={loading !== null}>
            {loading === 'premium' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} className="text-gold-300" />}
            {t('dash.ml.approve')} ({fee(prices.badge)})
          </Button>
        ) : (
          <div className="w-full inline-flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <ShieldCheck size={14} /> İstBaku {t('listings.approvedShort')} ✓
          </div>
        )}

        {!isPrivate && price >= 500000 && userKycStatus === 'approved' && (
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handlePrivate} disabled={loading !== null}>
            {loading === 'private' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {t('owner.private')}
          </Button>
        )}
      </CardBody>

      <PaymentModal open={!!pending} payment={pending} onClose={() => setPending(null)} onSuccess={onPaid} />
    </Card>
  );
}

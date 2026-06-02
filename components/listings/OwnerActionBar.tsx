'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { PaymentModal, type PendingPayment } from '@/components/payments/PaymentModal';
import { renewListingDateAction, requestPremiumUpgradeAction, convertToPrivateAction } from '@/lib/listing-owner-actions';

interface Props {
  listingId: string;
  currentTier: string;
  isApproved: boolean;
  isPrivate: boolean;
  price: number;
  userKycStatus: string;
}

export function OwnerActionBar({ listingId, currentTier, isApproved, isPrivate, price, userKycStatus }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingPayment | null>(null);
  // Ödeme başarıyla onaylanınca gösterilecek mesaj.
  const successRef = React.useRef<{ title: string; description: string } | null>(null);

  async function startRenew() {
    setLoading('renew');
    const res = await renewListingDateAction(listingId);
    setLoading(null);
    if (!res.ok) { toast({ variant: 'error', title: 'Hata', description: res.error }); return; }
    successRef.current = { title: 'Tarih yenilendi', description: 'Ödeme onaylandı — ilanın tarihi tazelendi.' };
    setPending({ paymentId: res.paymentId, amount: res.amount, currency: res.currency, title: 'Tarihi Yenile', description: 'İlanın yayın tarihi tazelenir ve listelerde öne çıkar.' });
  }

  async function startPremium() {
    setLoading('premium');
    const res = await requestPremiumUpgradeAction(listingId);
    setLoading(null);
    if (!res.ok) { toast({ variant: 'error', title: 'Hata', description: res.error }); return; }
    successRef.current = { title: 'Ödeme onaylandı', description: 'Premium başvurun admin onayına gönderildi.' };
    setPending({ paymentId: res.paymentId, amount: res.amount, currency: res.currency, title: 'İstBaku Onaylı Rozet', description: 'İlan en üst sıralarda gösterilir ve İstBaku Onaylı sürecine girer.' });
  }

  async function handlePrivate() {
    setLoading('private');
    const res = await convertToPrivateAction(listingId);
    setLoading(null);
    if (res.ok) { toast({ variant: 'success', title: 'Gizli portföye eklendi', description: 'İlanın artık sadece doğrulanmış kullanıcılara görünür.' }); router.refresh(); }
    else toast({ variant: 'error', title: 'Hata', description: res.error });
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
        <h3 className="text-sm font-semibold text-[color:var(--fg-muted)]">İlan Yönetimi</h3>

        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={startRenew} disabled={loading !== null}>
          {loading === 'renew' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Tarihi Yenile ($19)
        </Button>

        {!isApproved && (
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={startPremium} disabled={loading !== null}>
            {loading === 'premium' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} className="text-gold-300" />}
            İstBaku Onaylı Rozet Al ($49)
          </Button>
        )}

        {!isPrivate && price >= 500000 && userKycStatus === 'approved' && (
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handlePrivate} disabled={loading !== null}>
            {loading === 'private' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Gizli Portföy Yap
          </Button>
        )}
      </CardBody>

      <PaymentModal open={!!pending} payment={pending} onClose={() => setPending(null)} onSuccess={onPaid} />
    </Card>
  );
}

'use client';

import * as React from 'react';
import { RefreshCw, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
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
  const [loading, setLoading] = React.useState<string | null>(null);

  async function handleRenew() {
    setLoading('renew');
    const res = await renewListingDateAction(listingId);
    setLoading(null);
    if (res.ok) toast({ variant: 'success', title: 'Ödeme onaylandı', description: 'Ödeme onaylandı — ilanın tarihi yenilendi' });
    else toast({ variant: 'error', title: 'Hata', description: res.error });
  }

  async function handlePremium() {
    setLoading('premium');
    const res = await requestPremiumUpgradeAction(listingId);
    setLoading(null);
    if (res.ok) toast({ variant: 'success', title: 'Ödeme onaylandı', description: 'Ödeme onaylandı — premium başvurun admin onayına gönderildi' });
    else toast({ variant: 'error', title: 'Hata', description: res.error });
  }

  async function handlePrivate() {
    setLoading('private');
    const res = await convertToPrivateAction(listingId);
    setLoading(null);
    if (res.ok) toast({ variant: 'success', title: 'Gizli portföye eklendi', description: 'İlanın artık sadece doğrulanmış kullanıcılara görünür.' });
    else toast({ variant: 'error', title: 'Hata', description: res.error });
  }

  return (
    <Card glass>
      <CardBody className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[color:var(--fg-muted)]">İlan Yönetimi</h3>

        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleRenew} disabled={loading !== null}>
          {loading === 'renew' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Tarihi Yenile
        </Button>

        {!isApproved && (
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handlePremium} disabled={loading !== null}>
            {loading === 'premium' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} className="text-gold-300" />}
            Onaylı Premium Yap ($49)
          </Button>
        )}

        {!isPrivate && price >= 500000 && userKycStatus === 'approved' && (
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handlePrivate} disabled={loading !== null}>
            {loading === 'private' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Gizli Portföy Yap
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

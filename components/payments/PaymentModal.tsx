'use client';

import * as React from 'react';
import { CreditCard, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { formatPrice, convert } from '@/lib/currency';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { useCurrency } from '@/lib/currency-store';
import type { Currency } from '@/lib/types';

export interface PendingPayment {
  paymentId: string;
  amount: number; // sent (minor units / cents)
  currency: Currency;
  title: string;
  description?: string;
  /** Gerçek (live) modda yönlendirilecek sağlayıcı URL'i. */
  checkoutUrl?: string;
}

interface Props {
  open: boolean;
  payment: PendingPayment | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

// 4900 (cent) → 49.00 birim
function majorAmount(minor: number): number {
  return minor / 100;
}

export function PaymentModal({ open, payment, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const { t } = useLang();
  const { currency: displayCurrency } = useCurrency();
  const [processing, setProcessing] = React.useState(false);
  const [card, setCard] = React.useState('');
  const [name, setName] = React.useState('');
  const [exp, setExp] = React.useState('');
  const [cvc, setCvc] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setProcessing(false);
      setCard(''); setName(''); setExp(''); setCvc('');
    }
  }, [open]);

  if (!payment) return null;

  // Ücret USD olarak saklanır; kullanıcının seçtiği para biriminde göster (Madde 10).
  const amountLabel = formatPrice(
    convert(majorAmount(payment.amount), payment.currency, displayCurrency),
    displayCurrency,
  );
  const isLive = !!payment.checkoutUrl;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;
    // Gerçek sağlayıcı modunda checkout URL'ine yönlendir.
    if (payment.checkoutUrl) {
      window.location.href = payment.checkoutUrl;
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/payments/mock-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.paymentId }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        toast({ variant: 'error', title: t('pay.fail.title'), description: data.error ?? t('pay.fail.generic') });
        setProcessing(false);
        return;
      }
      toast({ variant: 'success', title: t('pay.success.title'), description: t('pay.success.desc') });
      await onSuccess();
    } catch {
      toast({ variant: 'error', title: t('pay.fail.title'), description: t('pay.conn.error') });
      setProcessing(false);
    }
  }

  return (
    <Modal open={open} onClose={processing ? () => {} : onClose} title={t('pay.modal.title')} size="sm">
      <div className="space-y-5">
        <div className="rounded-xl border bg-[color:var(--bg-elev)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[color:var(--fg-muted)]">{payment.title}</span>
            <span className="text-xl font-bold text-gold-300">{amountLabel}</span>
          </div>
          {payment.description && (
            <p className="text-xs text-[color:var(--fg-muted)] mt-1.5">{payment.description}</p>
          )}
        </div>

        {isLive ? (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--fg-muted)]">
              {t('pay.redirect.desc')}
            </p>
            <Button
              type="button"
              variant="gold"
              className="w-full"
              disabled={processing}
              onClick={() => { setProcessing(true); window.location.href = payment!.checkoutUrl!; }}
            >
              {processing ? <><Loader2 size={16} className="animate-spin" /> {t('pay.redirecting')}</> : <><Lock size={15} /> {amountLabel} — {t('pay.redirect.button')}</>}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-[color:var(--fg-faint)]">
              <ShieldCheck size={12} /> {t('pay.secure.bank')}
            </p>
          </div>
        ) : (
        <form onSubmit={handlePay} className="space-y-3">
          <div>
            <Label>{t('pay.card.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('pay.card.name.ph')} required autoComplete="cc-name" />
          </div>
          <div>
            <Label>{t('pay.card.number')}</Label>
            <div className="relative">
              <Input
                value={card}
                onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                autoComplete="cc-number"
                required
                className="pl-9"
              />
              <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('pay.card.expiry')}</Label>
              <Input value={exp} onChange={(e) => setExp(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))} placeholder="AA/YY" inputMode="numeric" autoComplete="cc-exp" required />
            </div>
            <div>
              <Label>{t('pay.card.cvc')}</Label>
              <Input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" required />
            </div>
          </div>

          <Button type="submit" variant="gold" className="w-full" disabled={processing}>
            {processing ? <><Loader2 size={16} className="animate-spin" /> {t('pay.processing')}</> : <><Lock size={15} /> {amountLabel} {t('pay.action')}</>}
          </Button>
        </form>
        )}

        {!isLive && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[color:var(--fg-faint)]">
            <ShieldCheck size={12} /> {t('pay.mock.note')}
          </p>
        )}
      </div>
    </Modal>
  );
}

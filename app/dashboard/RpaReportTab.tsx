'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Plus, X, Clock, CheckCircle2, Download } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { PaymentModal, type PendingPayment } from '@/components/payments/PaymentModal';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { useCurrency } from '@/lib/currency-store';
import { formatUsdCents } from '@/lib/currency';
import { formatListingNumber, parseListingNumber } from '@/lib/listing-number';
import { requestRpaReportAction, type MyRpaReport } from '@/lib/rpa-actions';
import type { Property } from '@/lib/types';

const STATUS: Record<string, { v: 'gold' | 'success' | 'outline'; lk: string }> = {
  pending: { v: 'gold', lk: 'rpa.status.pending' },
  generated: { v: 'outline', lk: 'rpa.status.generated' },
  sent: { v: 'success', lk: 'rpa.status.sent' },
  cancelled: { v: 'outline', lk: 'rpa.status.cancelled' },
};

export function RpaReportTab({
  myListings, reports, priceUsdCents,
}: { myListings: Property[]; reports: MyRpaReport[]; priceUsdCents: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const { currency } = useCurrency();

  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [extra, setExtra] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [pending, setPending] = React.useState<PendingPayment | null>(null);

  function toggle(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function addExtra() {
    const n = parseListingNumber(extra);
    if (n == null) {
      toast({ variant: 'error', title: t('rpa.invalidNumber') });
      return;
    }
    setSelected((prev) => new Set(prev).add(n));
    setExtra('');
  }

  async function submit() {
    const nums = Array.from(selected);
    if (nums.length === 0) {
      toast({ variant: 'error', title: t('rpa.selectAtLeastOne') });
      return;
    }
    setSubmitting(true);
    const res = await requestRpaReportAction(nums);
    setSubmitting(false);
    if (!res.ok) {
      toast({ variant: 'error', title: t('rpa.requestFailed'), description: res.error });
      return;
    }
    setPending({
      paymentId: res.paymentId,
      amount: res.amount,
      currency: res.currency,
      checkoutUrl: res.checkoutUrl,
      title: t('rpa.title'),
      description: t('rpa.payDesc'),
    });
  }

  function onPaid() {
    setPending(null);
    setSelected(new Set());
    toast({ variant: 'success', title: t('rpa.sentTitle'), description: t('rpa.mailNote') });
    router.refresh();
  }

  const myNumbers = new Set(myListings.map((p) => p.listingNumber));
  const extraNumbers = Array.from(selected).filter((n) => !myNumbers.has(n));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><FileText size={18} className="text-gold-300" /> {t('dash.tab.rpaReports')}</h2>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">{t('rpa.intro')}</p>
      </div>

      {/* Yeni talep */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold">{t('rpa.newRequest')}</h3>
            <Badge variant="gold">{formatUsdCents(priceUsdCents, currency)}</Badge>
          </div>

          {/* Kendi ilanların */}
          {myListings.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">{t('rpa.yourListings')}</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {myListings.map((p) => (
                  <label key={p.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-[color:var(--bg-card-hover)]">
                    <input type="checkbox" checked={selected.has(p.listingNumber)} onChange={() => toggle(p.listingNumber)} className="size-4 accent-gold-400" />
                    <span className="font-mono text-xs text-gold-300">#{formatListingNumber(p.listingNumber)}</span>
                    <span className="text-sm truncate">{p.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Numarayla başka ilan ekle */}
          <div>
            <div className="text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">{t('rpa.addByNumber')}</div>
            <div className="flex gap-2">
              <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="00012" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }} />
              <Button variant="outline" onClick={addExtra}><Plus size={14} /> {t('rpa.add')}</Button>
            </div>
            {extraNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {extraNumbers.map((n) => (
                  <span key={n} className="inline-flex items-center gap-1 rounded-lg border bg-[color:var(--bg-elev)] px-2 py-1 text-xs font-mono">
                    #{formatListingNumber(n)}
                    <button type="button" onClick={() => toggle(n)} aria-label="Kaldır" className="text-[color:var(--fg-muted)] hover:text-danger"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-sm text-[color:var(--fg-muted)]">{selected.size} {t('rpa.selectedCount')}</span>
            <Button variant="gold" onClick={submit} loading={submitting} disabled={selected.size === 0}>
              <FileText size={14} /> {t('rpa.requestBtn')} ({formatUsdCents(priceUsdCents, currency)})
            </Button>
          </div>
          <p className="text-[11px] text-[color:var(--fg-faint)]">{t('rpa.mailNote')}</p>
        </CardBody>
      </Card>

      {/* Geçmiş talepler */}
      <div>
        <h3 className="font-semibold mb-2">{t('rpa.history')}</h3>
        {reports.length === 0 ? (
          <Card><CardBody className="text-center py-8 text-[color:var(--fg-muted)]">{t('rpa.noHistory')}</CardBody></Card>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => {
              const st = STATUS[r.status] ?? STATUS.pending;
              return (
                <Card key={r.id}>
                  <CardBody className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.status === 'sent' ? <CheckCircle2 size={16} className="text-success" /> : <Clock size={16} className="text-gold-300" />}
                      <span className="text-sm">{r.listingNumbers.map((n) => `#${formatListingNumber(n)}`).join(', ')}</span>
                      <Badge variant={st.v}>{t(st.lk)}</Badge>
                    </div>
                    {r.fileUrl
                      ? <a href={r.fileUrl} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><Download size={14} /> {t('rpa.download')}</Button></a>
                      : <span className="text-xs text-[color:var(--fg-muted)]">{t('rpa.mailNoteShort')}</span>}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PaymentModal open={!!pending} payment={pending} onClose={() => setPending(null)} onSuccess={onPaid} />
    </div>
  );
}

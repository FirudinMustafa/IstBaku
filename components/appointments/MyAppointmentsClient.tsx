'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, CalendarClock, Check, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { formatDateTimeInTz } from '@/lib/datetime';
import { acceptRescheduleAction, cancelAppointmentAction } from '@/lib/appointment-actions';

export interface MyAppt {
  id: string;
  scheduledAt: string;
  proposedAt: string | null;
  status: string;
  listingTitle: string | null;
  listingSlug: string | null;
  listingCountry: string | null;
  agentName: string | null;
}

const STATUS: Record<string, { k: string; v: 'default' | 'success' | 'gold' | 'danger' | 'ai' }> = {
  pending: { k: 'appt.status.pendingUser', v: 'gold' },
  confirmed: { k: 'appt.status.confirmed', v: 'success' },
  rescheduled: { k: 'appt.status.rescheduled', v: 'ai' },
  rejected: { k: 'appt.status.rejected', v: 'danger' },
  cancelled: { k: 'appt.status.cancelledUser', v: 'danger' },
  completed: { k: 'appt.status.completed', v: 'default' },
};

export function MyAppointmentsClient({ appointments }: { appointments: MyAppt[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [working, setWorking] = React.useState<string | null>(null);

  async function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setWorking(id);
    const res = await fn();
    setWorking(null);
    if (res.ok) { toast({ variant: 'success', title: okMsg }); router.refresh(); }
    else toast({ variant: 'error', title: t('appt.toast.fail'), description: res.error });
  }

  if (appointments.length === 0) {
    return (
      <Card><CardBody className="text-center py-10 text-sm text-[color:var(--fg-muted)]">
        {t('appt.empty.user')}
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => {
        const st = STATUS[a.status] ?? STATUS.pending;
        return (
          <Card key={a.id}>
            <CardBody className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.listingSlug ? (
                      <Link href={`/property/${a.listingSlug}`} className="font-semibold hover:text-gold-300">{a.listingTitle}</Link>
                    ) : <span className="font-semibold">{a.listingTitle ?? '—'}</span>}
                    <Badge variant={st.v}>{t(st.k)}</Badge>
                  </div>
                  {a.agentName && <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">{a.agentName}</div>}
                  <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                    <Clock size={13} className="text-gold-300" />
                    <span className="font-medium">{formatDateTimeInTz(new Date(a.scheduledAt), a.listingCountry)}</span>
                  </div>
                  {a.status === 'rescheduled' && a.proposedAt && (
                    <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-[color:var(--fg)] bg-gold-400/10 border border-gold-400/30 rounded-lg px-2 py-1">
                      <CalendarClock size={12} className="text-gold-300" /> {t('appt.officeProposed')} {formatDateTimeInTz(new Date(a.proposedAt), a.listingCountry)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {a.status === 'rescheduled' && a.proposedAt && (
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" className="gap-1" loading={working === a.id}
                        onClick={() => run(a.id, () => acceptRescheduleAction(a.id), t('appt.toast.accepted'))}>
                        <Check size={13} /> {t('appt.btn.accept')}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-danger hover:bg-danger/10" loading={working === a.id}
                        onClick={() => run(a.id, () => cancelAppointmentAction(a.id), t('appt.toast.rejected'))}>
                        <X size={13} /> {t('appt.btn.reject')}
                      </Button>
                    </div>
                  )}
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" loading={working === a.id}
                      onClick={() => run(a.id, () => cancelAppointmentAction(a.id), t('appt.toast.cancelled'))}>
                      {t('appt.btn.cancel')}
                    </Button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

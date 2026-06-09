'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Clock, CalendarClock, Mail, Phone } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { formatDateTimeInTz, wallClockToUtcIso } from '@/lib/datetime';
import {
  confirmAppointmentAction, rejectAppointmentAction, proposeRescheduleAction, cancelAppointmentAction,
} from '@/lib/appointment-actions';

export interface AgentAppt {
  id: string;
  scheduledAt: string;
  proposedAt: string | null;
  status: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  notes: string | null;
  listingTitle: string | null;
  listingSlug: string | null;
  listingCountry: string | null;
}

const STATUS: Record<string, { k: string; v: 'default' | 'success' | 'gold' | 'danger' | 'ai' }> = {
  pending: { k: 'appt.status.pending', v: 'gold' },
  confirmed: { k: 'appt.status.confirmed', v: 'success' },
  rescheduled: { k: 'appt.status.rescheduled', v: 'ai' },
  rejected: { k: 'appt.status.rejected', v: 'danger' },
  cancelled: { k: 'appt.status.cancelled', v: 'danger' },
  completed: { k: 'appt.status.completed', v: 'default' },
};

export function AgentAppointmentsClient({ appointments }: { appointments: AgentAppt[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [working, setWorking] = React.useState<string | null>(null);
  const [proposingFor, setProposingFor] = React.useState<string | null>(null);
  const [proposeVal, setProposeVal] = React.useState('');

  async function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setWorking(id);
    const res = await fn();
    setWorking(null);
    if (res.ok) {
      toast({ variant: 'success', title: okMsg });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('appt.toast.fail'), description: res.error });
    }
  }

  async function propose(a: AgentAppt) {
    if (!proposeVal) { toast({ variant: 'error', title: t('appt.toast.pickTime') }); return; }
    const [date, time] = proposeVal.split('T');
    const iso = wallClockToUtcIso(date, time, a.listingCountry);
    await run(a.id, () => proposeRescheduleAction(a.id, iso), t('appt.toast.proposed'));
    setProposingFor(null);
    setProposeVal('');
  }

  if (appointments.length === 0) {
    return (
      <Card><CardBody className="text-center py-10 text-sm text-[color:var(--fg-muted)]">
        {t('appt.empty.agent')}
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => {
        const st = STATUS[a.status] ?? STATUS.pending;
        const canAct = a.status === 'pending' || a.status === 'rescheduled';
        return (
          <Card key={a.id}>
            <CardBody className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.visitorName}</span>
                    <Badge variant={st.v}>{t(st.k)}</Badge>
                  </div>
                  {a.listingSlug ? (
                    <Link href={`/property/${a.listingSlug}`} className="text-sm text-gold-300 hover:underline">{a.listingTitle}</Link>
                  ) : <span className="text-sm text-[color:var(--fg-muted)]">{a.listingTitle ?? '—'}</span>}
                  <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                    <Clock size={13} className="text-gold-300" />
                    <span className="font-medium">{formatDateTimeInTz(new Date(a.scheduledAt), a.listingCountry)}</span>
                  </div>
                  {a.status === 'rescheduled' && a.proposedAt && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--fg-muted)]">
                      <CalendarClock size={12} /> {t('appt.proposed')} {formatDateTimeInTz(new Date(a.proposedAt), a.listingCountry)} {t('appt.proposedWaiting')}
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-[color:var(--fg-muted)] flex-wrap">
                    <a href={`mailto:${a.visitorEmail}`} className="inline-flex items-center gap-1 hover:text-gold-300"><Mail size={11} /> {a.visitorEmail}</a>
                    {a.visitorPhone && <a href={`tel:${a.visitorPhone}`} className="inline-flex items-center gap-1 hover:text-gold-300"><Phone size={11} /> {a.visitorPhone}</a>}
                  </div>
                </div>

                {canAct && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" className="gap-1" loading={working === a.id}
                        onClick={() => run(a.id, () => confirmAppointmentAction(a.id), t('appt.toast.confirmed'))}>
                        <Check size={13} /> {t('appt.btn.confirm')}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-danger hover:bg-danger/10" loading={working === a.id}
                        onClick={() => run(a.id, () => rejectAppointmentAction(a.id), t('appt.toast.rejected'))}>
                        <X size={13} /> {t('appt.btn.reject')}
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1"
                      onClick={() => { setProposingFor(proposingFor === a.id ? null : a.id); setProposeVal(''); }}>
                      <CalendarClock size={13} /> {t('appt.btn.propose')}
                    </Button>
                  </div>
                )}
              </div>

              {proposingFor === a.id && (
                <div className="mt-3 flex items-end gap-2 flex-wrap border-t pt-3">
                  <div>
                    <label className="text-xs text-[color:var(--fg-muted)] block mb-1">{t('appt.field.proposedDate')}</label>
                    <input type="datetime-local" value={proposeVal} onChange={(e) => setProposeVal(e.target.value)}
                      className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-3 py-2 text-sm" />
                  </div>
                  <Button variant="gold" size="sm" loading={working === a.id} onClick={() => propose(a)}>{t('appt.btn.send')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setProposingFor(null)}>{t('appt.btn.cancelPropose')}</Button>
                </div>
              )}

              {a.status === 'confirmed' && (
                <div className="mt-3 border-t pt-3">
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" loading={working === a.id}
                    onClick={() => run(a.id, () => cancelAppointmentAction(a.id), t('appt.toast.cancelled'))}>
                    {t('appt.btn.cancel')}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

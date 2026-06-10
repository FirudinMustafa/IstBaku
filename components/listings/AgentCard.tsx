'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Phone, MessageCircle, Mail, Star, BadgeCheck, Clock, Calendar as CalendarIcon, MessageSquare,
  Building2, ArrowUpRight,
} from 'lucide-react';
import type { Agent } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { membershipDuration } from '@/lib/labels';
import { createAppointmentAction, getBookedSlotsAction } from '@/lib/appointment-actions';
import { wallClockToUtcIso } from '@/lib/datetime';
import { sendMessageAction } from '@/lib/message-actions';
import { messageSchema, appointmentSchema, fieldErrors } from '@/lib/schemas';
import { useLang } from '@/components/layout/LangProvider';

export interface AgentCardHandle {
  openMessage: () => void;
  openAppointment: () => void;
}

interface AgentCardProps {
  agent: Agent;
  propertyId: string;
  propertyTitle: string;
  /** İlanın ülkesi — randevu saatini doğru saat diliminde yorumlamak için (Madde 7). */
  propertyCountry?: string | null;
  /** Kartın görünmesi gerekmeyen yerlerde sadece modal yöneticisi olarak kullan */
  hideCard?: boolean;
}

export const AgentCard = React.forwardRef<AgentCardHandle, AgentCardProps>(function AgentCard(
  { agent, propertyId, propertyTitle, propertyCountry, hideCard },
  ref,
) {
  const { toast } = useToast();
  const { t } = useLang();
  const [openMsg, setOpenMsg] = React.useState(false);
  const [openAppt, setOpenAppt] = React.useState(false);
  const [msg, setMsg] = React.useState(t('agent.defaultMsg').replace('{title}', propertyTitle));
  const [sending, setSending] = React.useState(false);

  async function sendMsg() {
    const parsed = messageSchema.safeParse({
      toUserId: agent.id,
      content: msg,
      listingId: propertyId,
      listingTitle: propertyTitle,
    });
    if (!parsed.success) {
      const errs = fieldErrors(parsed);
      toast({ variant: 'error', title: errs.content ?? t('agent.msgInvalid') });
      return;
    }
    setSending(true);
    const res = await sendMessageAction(parsed.data);
    setSending(false);
    if (!res.ok) {
      toast({ variant: 'error', title: t('agent.msgFailed'), description: res.error });
      return;
    }
    setOpenMsg(false);
    toast({
      variant: 'success',
      title: t('agent.msgSent'),
      description: t('agent.msgSentDesc').replace('{name}', agent.name),
    });
  }

  React.useImperativeHandle(ref, () => ({
    openMessage: () => setOpenMsg(true),
    openAppointment: () => setOpenAppt(true),
  }), []);

  return (
    <>
      {!hideCard && (
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            {/* MC-23: explicit width/height to prevent CLS on agent avatar. */}
            <img src={agent.avatar} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold truncate">{agent.name}</div>
                {agent.verified && <BadgeCheck size={14} className="text-gold-300 shrink-0" />}
              </div>
              <div className="text-xs text-[color:var(--fg-muted)] truncate">{agent.agency}</div>
            </div>
          </div>

          {/* PF-13: discoverable Message-agent CTA above the fold. Primary
              gold button with localized label + aria-label + keyboard support
              (native <button> already activates on Space/Enter). It opens
              the same message Modal as the icon button further down. */}
          <Button
            variant="gold"
            size="md"
            className="w-full mt-4 gap-1.5"
            onClick={() => setOpenMsg(true)}
            aria-label={t('property.messageAgentAria')}
            data-testid="message-agent-primary"
          >
            <MessageSquare size={14} aria-hidden="true" /> {t('property.messageAgent')}
          </Button>

          {agent.bio && (
            <p className="mt-3 text-xs text-[color:var(--fg-muted)] leading-relaxed">{agent.bio}</p>
          )}

          {/* Sayısal göstergeler */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Stat icon={<Star size={11} fill="currentColor" />} label={t('agent.rating')} value={`${agent.rating.toFixed(1)}/5`} accent />
            <Stat icon={<MessageSquare size={11} />} label={t('agent.reviews')} value={String(agent.reviewsCount)} />
            <Stat icon={<Clock size={11} />} label={t('agent.response')} value={`~${agent.responseMins} ${t('unit.min')}`} />
            <Stat label={t('agent.listings')} value={String(agent.listingsCount)} />
            <Stat label={t('agent.membership')} value={membershipDuration(agent.memberSince)} className="col-span-2" />
          </div>

          <Badge variant="success" className="mt-3">{t('agent.performance')}: {agent.performance}/100</Badge>

          {/* Ajan/ofis public profili — TÜM ajanlarda (tur3 #2) */}
          <Link href={`/office/${agent.id}`} className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gold-400/30 bg-gold-400/5 px-3 py-2.5 hover:border-gold-400/60 transition-colors">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Building2 size={15} className="text-gold-300" /> {agent.isOffice ? t('agent.officePage') : t('agent.profilePage')}
            </span>
            <ArrowUpRight size={16} className="text-gold-300" />
          </Link>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <a href={`tel:${agent.phone}`}>
              <Button variant="secondary" size="sm" className="w-full gap-1"><Phone size={13} /></Button>
            </a>
            <a href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
              <Button variant="gold" size="sm" className="w-full gap-1"><MessageCircle size={13} /></Button>
            </a>
            <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setOpenMsg(true)}>
              <Mail size={13} />
            </Button>
          </div>

          <Button variant="primary" size="md" className="w-full mt-3 gap-1.5" onClick={() => setOpenAppt(true)}>
            <CalendarIcon size={14} /> {t('agent.appointmentBtn')}
          </Button>
        </CardBody>
      </Card>
      )}

      <Modal open={openMsg} onClose={() => setOpenMsg(false)} title={`${agent.name} — ${t('agent.message')}`}>
        <Textarea
          id="agent-msg"
          label={t('agent.messageLabel')}
          rows={5}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          maxLength={4000}
        />
        <Button variant="gold" className="w-full mt-3" onClick={sendMsg} loading={sending}>
          <Mail size={14} aria-hidden="true" /> {t('common.send')}
        </Button>
        <p className="mt-2 text-[10px] text-[color:var(--fg-faint)]">
          {t('agent.privacyNote')}
        </p>
      </Modal>

      <AppointmentModal open={openAppt} onClose={() => setOpenAppt(false)} agent={agent} propertyId={propertyId} propertyTitle={propertyTitle} propertyCountry={propertyCountry} />
    </>
  );
});

function Stat({
  icon, label, value, accent, className,
}: { icon?: React.ReactNode; label: string; value: string; accent?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl border bg-[color:var(--bg-elev)] p-2 ${className ?? ''}`}>
      <div className="text-[10px] uppercase text-[color:var(--fg-faint)] flex items-center gap-1">
        {icon} {label}
      </div>
      <div className={`font-bold text-xs mt-0.5 ${accent ? 'text-gold-300' : ''}`}>{value}</div>
    </div>
  );
}

// ---- Appointment Modal -----------------------------------------------------

function nextDates(n = 7): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

/** İlanın ülkesinin saat diliminde slot ISO'su üretir (Madde 7 — saat kayması fix). */
function slotIso(date: string, time: string, country?: string | null) {
  // date = YYYY-MM-DD, time = HH:MM. İlan bölgesinin duvar saati olarak yorumlanır.
  return wallClockToUtcIso(date, time, country);
}

function AppointmentModal({
  open, onClose, agent, propertyId, propertyTitle, propertyCountry,
}: {
  open: boolean;
  onClose: () => void;
  agent: Agent;
  propertyId: string;
  propertyTitle: string;
  propertyCountry?: string | null;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const [bookedIso, setBookedIso] = React.useState<Set<string>>(new Set());
  const [date, setDate] = React.useState<string>(nextDates(1)[0]);
  const [time, setTime] = React.useState<string>('11:00');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const dates = nextDates(7);
    const from = `${dates[0]}T00:00:00.000Z`;
    const to = `${dates[dates.length - 1]}T23:59:59.999Z`;
    getBookedSlotsAction(agent.id, from, to).then((res) => {
      if (res.ok) setBookedIso(new Set(res.slots));
    });
  }, [open, agent.id]);

  const dates = nextDates(7);
  const isBooked = (d: string, t: string) => bookedIso.has(slotIso(d, t, propertyCountry));

  async function confirm() {
    // MC-14: validate the booking payload via zod (future-only, email/phone format, etc.).
    const parsed = appointmentSchema.safeParse({
      listingId: propertyId,
      agentId: agent.id,
      date,
      time,
      visitorName: name,
      visitorEmail: email,
      visitorPhone: phone,
      notes: undefined,
    });
    if (!parsed.success) {
      const errs = fieldErrors(parsed);
      const first = errs.visitorName ?? errs.visitorEmail ?? errs.visitorPhone ?? errs.date ?? errs._form ?? t('appt.toast.formIncomplete');
      toast({ variant: 'error', title: t('appt.toast.invalid'), description: first });
      return;
    }
    if (isBooked(date, time)) {
      toast({ variant: 'error', title: t('appt.toast.slotFull'), description: t('appt.toast.slotFullDesc') });
      return;
    }
    setWorking(true);
    const res = await createAppointmentAction({
      listingId: propertyId,
      agentId: agent.id,
      scheduledAtIso: slotIso(date, time, propertyCountry),
      name: parsed.data.visitorName,
      email: parsed.data.visitorEmail,
      phone: parsed.data.visitorPhone || undefined,
    });
    setWorking(false);
    if (!res.ok) {
      toast({ variant: 'error', title: t('appt.toast.createFailed'), description: res.error });
      if (res.error === 'Bu saat dolu.') {
        setBookedIso((cur) => new Set(cur).add(slotIso(date, time, propertyCountry)));
      }
      return;
    }
    setBookedIso((cur) => new Set(cur).add(slotIso(date, time, propertyCountry)));
    toast({
      variant: 'success',
      title: t('appt.toast.created'),
      description: t('appt.toast.createdDesc')
        .replace('{date}', date).replace('{time}', time)
        .replace('{name}', agent.name).replace('{email}', email),
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t('appt.title')} size="lg">
      <p className="text-sm text-[color:var(--fg-muted)] mb-4">
        {t('appt.intro').replace('{title}', propertyTitle).replace(/\{name\}/g, agent.name)}
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Input
          id="appt-name"
          label={t('appt.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('appt.namePh')}
          autoComplete="name"
          required
        />
        <Input
          id="appt-email"
          label={t('appt.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@mail.com"
          autoComplete="email"
          required
        />
        <Input
          id="appt-phone"
          label={t('appt.phone')}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+90 5XX…"
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <Label>{t('appt.dateLabel')}</Label>
      <div role="group" aria-label={t('appt.ariaPickDate')} className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {dates.map((d) => {
          const dt = new Date(d);
          const day = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
          const num = dt.getDate();
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              aria-pressed={date === d}
              aria-label={dt.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              className={`shrink-0 rounded-xl border px-3 py-2 text-center transition-colors ${
                date === d ? 'bg-gold-400/15 border-gold-400 text-gold-300' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-card-hover)]'
              }`}
            >
              <div className="text-[10px] uppercase opacity-70">{day}</div>
              <div className="text-lg font-bold leading-none mt-0.5">{num}</div>
              <div className="text-[10px] opacity-60 mt-1">{dt.toLocaleDateString('tr-TR', { month: 'short' })}</div>
            </button>
          );
        })}
      </div>

      <Label>{t('appt.timeLabel')}</Label>
      <div role="group" aria-label={t('appt.ariaPickTime')} className="grid grid-cols-4 gap-2 mb-4">
        {TIME_SLOTS.map((slot) => {
          const taken = isBooked(date, slot);
          return (
            <button
              key={slot}
              type="button"
              disabled={taken}
              aria-disabled={taken || undefined}
              aria-pressed={time === slot && !taken}
              aria-label={taken ? t('appt.slotTaken').replace('{t}', slot) : t('appt.slotFree').replace('{t}', slot)}
              onClick={() => setTime(slot)}
              className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                time === slot && !taken ? 'bg-gold-400 text-navy-900 border-gold-400' : 'border-[color:var(--border)]'
              } ${taken ? 'opacity-40 line-through cursor-not-allowed' : 'hover:border-gold-400/60'}`}
            >
              {slot}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[color:var(--fg-faint)] mb-3">
        {t('appt.liveNote')}
      </p>

      <Button variant="gold" className="w-full" onClick={confirm} loading={working}>
        <CalendarIcon size={14} /> {date} · {time} — {t('appt.confirmBtn')}
      </Button>
    </Modal>
  );
}

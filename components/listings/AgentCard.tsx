'use client';

import * as React from 'react';
import {
  Phone, MessageCircle, Mail, Star, BadgeCheck, Clock, Calendar as CalendarIcon, MessageSquare,
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
  /** Kartın görünmesi gerekmeyen yerlerde sadece modal yöneticisi olarak kullan */
  hideCard?: boolean;
}

export const AgentCard = React.forwardRef<AgentCardHandle, AgentCardProps>(function AgentCard(
  { agent, propertyId, propertyTitle, hideCard },
  ref,
) {
  const { toast } = useToast();
  const { t } = useLang();
  const [openMsg, setOpenMsg] = React.useState(false);
  const [openAppt, setOpenAppt] = React.useState(false);
  const [msg, setMsg] = React.useState(`Merhaba, "${propertyTitle}" ilanı hâlâ müsait mi?`);
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
      toast({ variant: 'error', title: errs.content ?? 'Mesaj geçersiz' });
      return;
    }
    setSending(true);
    const res = await sendMessageAction(parsed.data);
    setSending(false);
    if (!res.ok) {
      toast({ variant: 'error', title: 'Mesaj gönderilemedi', description: res.error });
      return;
    }
    setOpenMsg(false);
    toast({
      variant: 'success',
      title: 'Mesaj iletildi',
      description: `${agent.name} kısa süre içinde dönüş yapacak. Konuşmayı Panelim → Mesajlar bölümünden takip edebilirsin.`,
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
            <Stat icon={<Star size={11} fill="currentColor" />} label="Puan" value={`${agent.rating.toFixed(1)}/5`} accent />
            <Stat icon={<MessageSquare size={11} />} label="Yorum" value={String(agent.reviewsCount)} />
            <Stat icon={<Clock size={11} />} label="Yanıt" value={`~${agent.responseMins} dk`} />
            <Stat label="İlan" value={String(agent.listingsCount)} />
            <Stat label="Üyelik" value={membershipDuration(agent.memberSince)} className="col-span-2" />
          </div>

          <Badge variant="success" className="mt-3">Performans: {agent.performance}/100</Badge>

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
            <CalendarIcon size={14} /> Gezinti Randevusu Al
          </Button>
        </CardBody>
      </Card>
      )}

      <Modal open={openMsg} onClose={() => setOpenMsg(false)} title={`${agent.name} ile mesajlaş`}>
        <Textarea
          id="agent-msg"
          label="Mesajın"
          rows={5}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          maxLength={4000}
        />
        <Button variant="gold" className="w-full mt-3" onClick={sendMsg} loading={sending}>
          <Mail size={14} aria-hidden="true" /> Gönder
        </Button>
        <p className="mt-2 text-[10px] text-[color:var(--fg-faint)]">
          Mesajların ISTBAKU üzerinden kayıt altında tutulur (KVKK uyumlu).
        </p>
      </Modal>

      <AppointmentModal open={openAppt} onClose={() => setOpenAppt(false)} agent={agent} propertyId={propertyId} propertyTitle={propertyTitle} />
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

/** Build a local ISO timestamp (with offset) for an agent slot. */
function slotIso(date: string, time: string) {
  // date = YYYY-MM-DD, time = HH:MM. Treat as local time of the agent.
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

function AppointmentModal({
  open, onClose, agent, propertyId, propertyTitle,
}: {
  open: boolean;
  onClose: () => void;
  agent: Agent;
  propertyId: string;
  propertyTitle: string;
}) {
  const { toast } = useToast();
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
  const isBooked = (d: string, t: string) => bookedIso.has(slotIso(d, t));

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
      const first = errs.visitorName ?? errs.visitorEmail ?? errs.visitorPhone ?? errs.date ?? errs._form ?? 'Form eksik';
      toast({ variant: 'error', title: 'Geçersiz randevu', description: first });
      return;
    }
    if (isBooked(date, time)) {
      toast({ variant: 'error', title: 'Saat dolu', description: 'Başka bir saat seçer misin?' });
      return;
    }
    setWorking(true);
    const res = await createAppointmentAction({
      listingId: propertyId,
      agentId: agent.id,
      scheduledAtIso: slotIso(date, time),
      name: parsed.data.visitorName,
      email: parsed.data.visitorEmail,
      phone: parsed.data.visitorPhone || undefined,
    });
    setWorking(false);
    if (!res.ok) {
      toast({ variant: 'error', title: 'Randevu oluşturulamadı', description: res.error });
      if (res.error === 'Bu saat dolu.') {
        setBookedIso((cur) => new Set(cur).add(slotIso(date, time)));
      }
      return;
    }
    setBookedIso((cur) => new Set(cur).add(slotIso(date, time)));
    toast({
      variant: 'success',
      title: 'Randevu oluşturuldu',
      description: `${date} · ${time} — ${agent.name} ile. Onay maili ${email} adresine gönderildi.`,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Gezinti Randevusu" size="lg">
      <p className="text-sm text-[color:var(--fg-muted)] mb-4">
        <strong>{propertyTitle}</strong> ilanı için {agent.name} ile yerinde gezinti randevusu oluştur.
        Onaylandığında {agent.name}'a, sana ve diğer kullanıcılara takvim üzerinde görünür.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Input
          id="appt-name"
          label="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adınız"
          autoComplete="name"
          required
        />
        <Input
          id="appt-email"
          label="E-posta"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@mail.com"
          autoComplete="email"
          required
        />
        <Input
          id="appt-phone"
          label="Telefon"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+90 5XX…"
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <Label>Tarih</Label>
      <div role="group" aria-label="Tarih seç" className="flex gap-2 overflow-x-auto pb-2 mb-3">
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

      <Label>Saat</Label>
      <div role="group" aria-label="Saat seç" className="grid grid-cols-4 gap-2 mb-4">
        {TIME_SLOTS.map((t) => {
          const taken = isBooked(date, t);
          return (
            <button
              key={t}
              type="button"
              disabled={taken}
              aria-disabled={taken || undefined}
              aria-pressed={time === t && !taken}
              aria-label={taken ? `${t} dolu` : `${t} saat`}
              onClick={() => setTime(t)}
              className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                time === t && !taken ? 'bg-gold-400 text-navy-900 border-gold-400' : 'border-[color:var(--border)]'
              } ${taken ? 'opacity-40 line-through cursor-not-allowed' : 'hover:border-gold-400/60'}`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[color:var(--fg-faint)] mb-3">
        Şu an üstü çizili saatler başka bir kullanıcı tarafından alındı. Karışıklık olmasın diye paylaşılan takvim canlı senkronizedir.
      </p>

      <Button variant="gold" className="w-full" onClick={confirm} loading={working}>
        <CalendarIcon size={14} /> {date} · {time} — Randevuyu Onayla
      </Button>
    </Modal>
  );
}

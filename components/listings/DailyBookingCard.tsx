'use client';

import * as React from 'react';
import { CalendarDays, Users, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/user-auth';
import { createDailyBookingAction } from '@/lib/daily-booking-actions';
import { formatPrice } from '@/lib/currency';
import type { Currency } from '@/lib/types';
import { AvailabilityCalendar } from './AvailabilityCalendar';

interface OccupiedRange {
  checkIn: string;
  checkOut: string;
  status: string;
}

interface Props {
  listingId: string;
  pricePerNight: number;
  currency: Currency;
  minNights: number;
  notes?: string;
  occupied: OccupiedRange[];
}

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function DailyBookingCard({
  listingId, pricePerNight, currency, minNights, notes, occupied,
}: Props) {
  const { toast } = useToast();
  const { user } = useUser();
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [checkIn, setCheckIn] = React.useState<string>(toDateInput(today));
  const [checkOut, setCheckOut] = React.useState<string>(toDateInput(tomorrow));
  const [guestName, setGuestName] = React.useState(user?.name ?? '');
  const [guestEmail, setGuestEmail] = React.useState(user?.email ?? '');
  const [guestPhone, setGuestPhone] = React.useState('');
  const [guestCount, setGuestCount] = React.useState(1);
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setGuestName((cur) => cur || user.name || '');
      setGuestEmail((cur) => cur || user.email || '');
    }
  }, [user]);

  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const validRange = !Number.isNaN(ci.getTime()) && !Number.isNaN(co.getTime()) && co > ci;
  const nights = validRange ? Math.round((co.getTime() - ci.getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const total = nights * pricePerNight;

  // Çakışma uyarısı (client tarafında bilgi amaçlı; server zaten kesin reddeder)
  const conflicts = occupied.filter((r) => {
    const rCi = new Date(r.checkIn);
    const rCo = new Date(r.checkOut);
    return rCi < co && rCo > ci;
  });
  const hasConflict = conflicts.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast({ variant: 'error', title: 'Giriş gerekli', description: 'Rezervasyon için giriş yap.' });
      return;
    }
    if (!validRange) {
      toast({ variant: 'error', title: 'Tarih hatası', description: 'Çıkış tarihi giriş tarihinden sonra olmalı.' });
      return;
    }
    if (nights < minNights) {
      toast({ variant: 'error', title: 'Minimum gece', description: `En az ${minNights} gece rezervasyon yap.` });
      return;
    }
    setSubmitting(true);
    const res = await createDailyBookingAction({
      listingId,
      checkInIso: ci.toISOString(),
      checkOutIso: co.toISOString(),
      guestName,
      guestEmail,
      guestPhone: guestPhone || undefined,
      guestCount,
      notes: message || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
      toast({ variant: 'success', title: 'Talep gönderildi', description: 'İlan sahibi onayladığında bildirim alacaksın.' });
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  if (submitted) {
    return (
      <Card glass>
        <CardBody className="p-5 text-center">
          <CheckCircle2 size={32} className="text-success mx-auto" />
          <h3 className="mt-3 font-semibold">Rezervasyon talebin alındı</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            İlan sahibi onayladığında bildirim ve e-posta alırsın.
            <br />Panelinden takip edebilirsin.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card glass>
      <CardBody className="p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xl font-bold text-gold-300">{formatPrice(pricePerNight, currency)}</div>
            <div className="text-xs text-[color:var(--fg-muted)]">/ gece · min {minNights} gece</div>
          </div>
          <CalendarDays size={18} className="text-gold-300" />
        </div>

        {notes && (
          <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2.5 text-xs text-[color:var(--fg-muted)]">
            {notes}
          </div>
        )}

        <AvailabilityCalendar
          occupied={occupied}
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
        />

        <form onSubmit={handleSubmit} className="space-y-3">

          <div>
            <Label className="!text-[10px]"><Users size={11} className="inline -mt-0.5" /> Misafir sayısı</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(1, +e.target.value))}
            />
          </div>

          {user ? (
            <div className="space-y-2">
              <div>
                <Label className="!text-[10px]">Ad Soyad</Label>
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
              </div>
              <div>
                <Label className="!text-[10px]">E-posta</Label>
                <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
              </div>
              <div>
                <Label className="!text-[10px]">Telefon (opsiyonel)</Label>
                <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
              <div>
                <Label className="!text-[10px]">Not (opsiyonel)</Label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Geliş saati, özel istek vb."
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gold-400/30 bg-gold-400/5 p-3 text-xs">
              Rezervasyon talebi için <a href="/auth/sign-in" className="text-gold-300 underline">giriş yap</a>.
            </div>
          )}

          {validRange && (
            <div className="rounded-xl border bg-[color:var(--bg-elev)] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--fg-muted)]">{nights} gece × {formatPrice(pricePerNight, currency)}</span>
                <span className="font-bold text-gold-300">{formatPrice(total, currency)}</span>
              </div>
            </div>
          )}

          {hasConflict && (
            <div className="rounded-lg bg-danger/10 border border-danger/30 p-2 text-xs text-danger">
              ⚠ Seçtiğin tarih başka bir rezervasyonla çakışıyor.
            </div>
          )}

          <Button
            type="submit"
            variant="gold"
            className="w-full gap-2"
            disabled={!user || submitting || !validRange || hasConflict || nights < minNights}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Rezervasyon Talep Et
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

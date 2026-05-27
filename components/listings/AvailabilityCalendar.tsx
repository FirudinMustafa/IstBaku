'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────── types ── */

interface AvailabilityCalendarProps {
  occupied: { checkIn: string; checkOut: string; status: string }[];
  checkIn: string;
  checkOut: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
}

/* ──────────────────────────────────── constants ── */

const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'] as const;
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
] as const;

/* ──────────────────────────────────── helpers ── */

/** YYYY-MM-DD from a Date (local). */
function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Start of day (midnight) for a YYYY-MM-DD string. */
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days in a given month (0-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-based day-of-week (0 = Mon … 6 = Sun). */
function dayOfWeekMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/* ──────────────────────────────── component ── */

export function AvailabilityCalendar({
  occupied,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
}: AvailabilityCalendarProps) {
  const todayStr = toISO(new Date());

  /* ── which month is displayed ── */
  const initial = checkIn ? parseISO(checkIn) : new Date();
  const [viewYear, setViewYear] = React.useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initial.getMonth());

  const goBack = () => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  };
  const goForward = () => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  };

  /* ── pre-compute occupied lookup (keyed by date string) ── */
  const occupiedMap = React.useMemo(() => {
    const map = new Map<string, 'approved' | 'pending'>();
    for (const r of occupied) {
      const start = parseISO(r.checkIn);
      const end = parseISO(r.checkOut);
      const cursor = new Date(start);
      while (cursor < end) {
        const key = toISO(cursor);
        const status = r.status === 'approved' ? 'approved' : 'pending';
        // approved takes precedence
        if (!map.has(key) || status === 'approved') map.set(key, status);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [occupied]);

  /* ── click handler ── */
  const handleClick = (dateStr: string) => {
    // If no check-in yet, or both are set, start fresh with this as check-in
    if (!checkIn || (checkIn && checkOut)) {
      onCheckInChange(dateStr);
      onCheckOutChange('');
      return;
    }
    // If only check-in is set
    if (dateStr > checkIn) {
      onCheckOutChange(dateStr);
    } else {
      // clicked before current check-in — reset check-in
      onCheckInChange(dateStr);
      onCheckOutChange('');
    }
  };

  /* ── build grid ── */
  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startPad = dayOfWeekMon(firstDay); // blanks before day 1

  const ciDate = checkIn ? parseISO(checkIn) : null;
  const coDate = checkOut ? parseISO(checkOut) : null;

  const cells: React.ReactNode[] = [];

  // blank cells
  for (let i = 0; i < startPad; i++) {
    cells.push(<div key={`pad-${i}`} />);
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(viewYear, viewMonth, day);
    const dateStr = toISO(d);
    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;

    const occStatus = occupiedMap.get(dateStr);

    const isCheckIn = checkIn === dateStr;
    const isCheckOut = checkOut === dateStr;
    const inRange =
      ciDate && coDate && d > ciDate && d < coDate;

    cells.push(
      <button
        key={dateStr}
        type="button"
        disabled={isPast}
        onClick={() => handleClick(dateStr)}
        className={cn(
          'relative flex items-center justify-center rounded-lg text-xs h-8 w-full transition-all',
          // past
          isPast && 'text-[color:var(--fg-faint)] opacity-40 cursor-not-allowed',
          // today ring
          isToday && !isCheckIn && !isCheckOut && 'ring-1 ring-[color:var(--fg-muted)]',
          // occupied colours (lowest priority in stacking)
          !isPast && !isCheckIn && !isCheckOut && !inRange && occStatus === 'approved' && 'bg-danger/20 text-danger',
          !isPast && !isCheckIn && !isCheckOut && !inRange && occStatus === 'pending' && 'bg-warning/20 text-warning',
          // selected range
          inRange && 'bg-gold-400/10',
          // check-in / check-out
          (isCheckIn || isCheckOut) && 'bg-gold-400/20 border border-gold-400 text-gold-300 font-semibold',
          // hover
          !isPast && !isCheckIn && !isCheckOut && 'hover:bg-[color:var(--bg-elev)]',
        )}
      >
        {day}
      </button>,
    );
  }

  return (
    <div className="select-none">
      {/* ── header ── */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goBack}
          className="p-1 rounded-lg hover:bg-[color:var(--bg-elev)] transition-colors text-[color:var(--fg-muted)]"
          aria-label="Önceki ay"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goForward}
          className="p-1 rounded-lg hover:bg-[color:var(--bg-elev)] transition-colors text-[color:var(--fg-muted)]"
          aria-label="Sonraki ay"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── day-of-week labels ── */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-center text-[10px] font-medium text-[color:var(--fg-muted)]">
            {l}
          </div>
        ))}
      </div>

      {/* ── day cells ── */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells}
      </div>

      {/* ── legend ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[10px] text-[color:var(--fg-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded bg-danger/30" /> Dolu
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded bg-warning/30" /> Beklemede
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded border border-gold-400 bg-gold-400/20" /> Seçili
        </span>
      </div>
    </div>
  );
}

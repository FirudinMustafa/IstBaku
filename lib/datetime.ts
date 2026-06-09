/**
 * Tarih/saat yardımcıları — sunucu UTC'de çalışır (Vercel). Randevu/booking
 * saatleri ilanın ülkesine göre yorumlanıp formatlanır ki kullanıcıya doğru
 * yerel saat gösterilsin (Madde 7 — "saat kayması" bug'ı).
 *
 * TR ve AZ DST kullanmaz: TR sabit UTC+3, AZ sabit UTC+4.
 */

const COUNTRY_TZ: Record<string, string> = {
  TR: 'Europe/Istanbul', // UTC+3
  AZ: 'Asia/Baku',       // UTC+4
};

const COUNTRY_OFFSET_HOURS: Record<string, number> = {
  TR: 3,
  AZ: 4,
};

const DEFAULT_TZ = 'Europe/Istanbul';
const DEFAULT_OFFSET = 3;

export function tzForCountry(country?: string | null): string {
  return COUNTRY_TZ[(country ?? '').toUpperCase()] ?? DEFAULT_TZ;
}

export function offsetForCountry(country?: string | null): number {
  return COUNTRY_OFFSET_HOURS[(country ?? '').toUpperCase()] ?? DEFAULT_OFFSET;
}

/**
 * `YYYY-MM-DD` + `HH:MM` yerel duvar saatini ilanın ülkesinin saat diliminde
 * yorumlayıp UTC ISO döndürür. Tarayıcının saat diliminden bağımsız — booking
 * yapan kişi farklı TZ'de olsa bile ilan bölgesinin saati korunur.
 */
export function wallClockToUtcIso(date: string, time: string, country?: string | null): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const offset = offsetForCountry(country);
  const utcMs = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - offset * 3600_000;
  return new Date(utcMs).toISOString();
}

export function formatDateInTz(d: Date, country?: string | null, locale = 'tr-TR'): string {
  return d.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: tzForCountry(country),
  });
}

export function formatTimeInTz(d: Date, country?: string | null, locale = 'tr-TR'): string {
  return d.toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit',
    timeZone: tzForCountry(country),
  });
}

export function formatDateTimeInTz(d: Date, country?: string | null, locale = 'tr-TR'): string {
  return d.toLocaleString(locale, {
    dateStyle: 'short', timeStyle: 'short',
    timeZone: tzForCountry(country),
  });
}

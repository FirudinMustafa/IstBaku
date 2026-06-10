'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail, Phone, Lock, User, ChevronDown, ArrowRight, CheckCircle2, MailCheck, AlertCircle,
  Users as UsersIcon, Briefcase, Building2, Paperclip, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { COUNTRY_CODES } from '@/lib/labels';
import { signUpAction, verifyCodeAction, resendVerificationCodeAction } from '@/lib/auth-actions';
import { signUpSchema, verifyCodeSchema, fieldErrors } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// PB-03: public sign-up role chooser. Whitelist matches lib/schemas.ts.
type PublicSignUpRole = 'user' | 'agent' | 'office';
const ROLE_OPTIONS: { v: PublicSignUpRole; labelKey: string; hintKey: string; Icon: typeof UsersIcon }[] = [
  { v: 'user', labelKey: 'auth.role.user', hintKey: 'auth.role.userHint', Icon: UsersIcon },
  { v: 'agent', labelKey: 'auth.role.agent', hintKey: 'auth.role.agentHint', Icon: Briefcase },
  { v: 'office', labelKey: 'auth.role.office', hintKey: 'auth.role.officeHint', Icon: Building2 },
];

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [step, setStep] = React.useState<'form' | 'verify' | 'done'>('form');
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [dialIso, setDialIso] = React.useState('TR');
  const [phone, setPhone] = React.useState('');
  const [accept, setAccept] = React.useState(false);
  const [role, setRole] = React.useState<PublicSignUpRole>('user');
  const [officeCountry, setOfficeCountry] = React.useState('TR');
  // Madde 5: ofis kaydı şirket/belge alanları
  const [officeNationalId, setOfficeNationalId] = React.useState('');
  const [officeTaxId, setOfficeTaxId] = React.useState('');
  const [officeCompany, setOfficeCompany] = React.useState('');
  const [officeAuthNo, setOfficeAuthNo] = React.useState('');
  const [officeAddress, setOfficeAddress] = React.useState('');
  const [officeCity, setOfficeCity] = React.useState('');
  const [officeDistrict, setOfficeDistrict] = React.useState('');
  const [officeDocs, setOfficeDocs] = React.useState<{ name: string; url: string }[]>([]);
  const [docUploading, setDocUploading] = React.useState(false);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const [createdEmail, setCreatedEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [resendBusy, setResendBusy] = React.useState(false);
  const [resendOk, setResendOk] = React.useState(false);

  React.useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPickerOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const dial = COUNTRY_CODES.find((c) => c.iso === dialIso)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    // MC-14: client-side zod validation with field-level error surfacing.
    const parsed = signUpSchema.safeParse({
      name,
      email,
      password,
      phoneDial: dial.dial,
      phone,
      role,
      acceptedTerms: accept,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return;
    }
    // Madde 5: ofis kaydında zorunlu belge/şirket alanları kontrolü.
    if (parsed.data.role === 'office' &&
        (!officeCompany.trim() || !officeNationalId.trim() || !officeTaxId.trim() || !officeCity.trim())) {
      setErrors({});
      setServerError(t('office.docs.required'));
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await signUpAction({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      phoneDial: parsed.data.phoneDial,
      phone: parsed.data.phone,
      // PB-03: forward role intent. Server re-validates against the whitelist.
      role: parsed.data.role,
      // Ofis kaydında ülke (Madde 6). Diğer rollerde yok sayılır.
      country: parsed.data.role === 'office' ? officeCountry : undefined,
      // Madde 5: ofis belge/şirket bilgileri.
      office: parsed.data.role === 'office' ? {
        nationalId: officeNationalId,
        taxId: officeTaxId,
        companyName: officeCompany,
        authorizationNo: officeAuthNo,
        officeAddress,
        officeCity,
        officeDistrict,
        officeDocs,
      } : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setCreatedEmail(res.user.email);
    setStep('verify');
    setCode('');
    toast({ variant: 'success', title: t('auth.toast.created'), description: t('auth.toast.createdDesc').replace('{email}', res.user.email) });
  }

  async function resend() {
    if (!createdEmail) return;
    setResendBusy(true);
    setResendOk(false);
    const r = await resendVerificationCodeAction(createdEmail);
    setResendBusy(false);
    if (r.ok) {
      setResendOk(true);
      toast({ variant: 'success', title: t('auth.toast.resent'), description: t('auth.toast.resentDesc').replace('{email}', createdEmail) });
    } else {
      setServerError(r.error);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const parsed = verifyCodeSchema.safeParse({ email: createdEmail, code });
    if (!parsed.success) {
      const errs = fieldErrors(parsed);
      setServerError(errs.code ?? errs.email ?? t('auth.codeIncomplete'));
      return;
    }
    setBusy(true);
    const res = await verifyCodeAction(parsed.data.email, parsed.data.code);
    setBusy(false);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    toast({ variant: 'success', title: t('auth.toast.verified'), description: t('auth.toast.verifiedDesc') });
    setTimeout(() => {
      router.push(`/auth/sign-in?email=${encodeURIComponent(createdEmail)}`);
    }, 600);
  }

  async function uploadDoc(file: File | null) {
    if (!file) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/auth/office-docs/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setOfficeDocs((prev) => [...prev, { name: file.name, url: data.url as string }].slice(0, 12));
      } else {
        toast({ variant: 'error', title: t('office.docs.uploadFailed'), description: data.error });
      }
    } catch {
      toast({ variant: 'error', title: t('office.docs.uploadFailed') });
    } finally {
      setDocUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  }

  if (step === 'verify') {
    return (
      <>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1 text-center">
          {createdEmail} {t('auth.codeSentTo')}
        </p>
        <form onSubmit={submitCode} noValidate className="mt-6 space-y-4">
          <div className="size-16 rounded-2xl bg-gold-400/15 text-gold-300 flex items-center justify-center mx-auto">
            <MailCheck size={28} aria-hidden="true" />
          </div>
          <p className="text-sm text-[color:var(--fg-muted)] text-center">
            <strong className="text-[color:var(--fg)] break-all">{createdEmail}</strong> {t('auth.codeSentBody')}
          </p>

          <Input
            id="signup-code"
            label={t('auth.codeLabel')}
            labelClassName="text-center"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="––––––"
            className="!h-14 text-center text-2xl tracking-[0.6em] font-mono font-bold !pr-3"
            hint={t('auth.codeHint')}
          />

          {serverError && (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {serverError}
            </div>
          )}

          <Button type="submit" variant="gold" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
            <CheckCircle2 size={15} aria-hidden="true" /> {t('auth.verifyBtn')}
          </Button>

          {/* PF-04: "Resend code" — addresses the dev/test pain point where the
              user can't read their OTP. Mirrors the production resend path
              (rate-limited 3/hour by `resend:<email>`). */}
          <div className="text-center text-xs text-[color:var(--fg-muted)]">
            {t('auth.noCode')}{' '}
            <button
              type="button"
              onClick={resend}
              data-testid="resend-code"
              disabled={resendBusy}
              className="text-gold-300 hover:underline disabled:opacity-50"
            >
              {resendBusy ? t('auth.resending') : t('auth.resend')}
            </button>
            {resendOk && (
              <span className="ml-2 text-success">{t('auth.sent')}</span>
            )}
          </div>
        </form>
      </>
    );
  }

  if (step === 'done') {
    return (
      <div className="mt-6 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-success/15 text-success flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <p className="text-sm text-[color:var(--fg-muted)]">{t('auth.congrats')} {name}! {t('auth.congratsBody')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-3">
      <div className="relative">
        <User size={15} className="absolute left-3 top-[34px] text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
        <Input
          id="signup-name"
          label={t('auth.name')}
          className="pl-9"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('auth.namePh')}
          required
          autoComplete="name"
          error={errors.name}
        />
      </div>

      <div className="relative">
        <Mail size={15} className="absolute left-3 top-[34px] text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
        <Input
          id="signup-email"
          label={t('auth.email')}
          className="pl-9"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.emailPh')}
          required
          autoComplete="email"
          error={errors.email}
          suppressHydrationWarning
        />
      </div>

      <div>
        <Label htmlFor="signup-phone">{t('auth.phone')}</Label>
        <div ref={pickerRef} className="flex gap-2 relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            aria-label={t('auth.aria.dialCode').replace('{name}', dial.name).replace('{dial}', dial.dial)}
            className="h-10 pl-3 pr-2 rounded-xl bg-[color:var(--bg-elev)] border hover:border-[color:var(--border-strong)] inline-flex items-center gap-1.5 text-sm shrink-0"
          >
            <span aria-hidden="true">{dial.flag}</span>
            <span className="font-mono">{dial.dial}</span>
            <ChevronDown size={13} className="text-[color:var(--fg-muted)]" aria-hidden="true" />
          </button>
          <div className="relative flex-1">
            <Phone size={15} className="absolute left-3 top-3 text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
            <Input
              id="signup-phone"
              type="tel"
              className="pl-9"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="555 010 1010"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-invalid={errors.phone ? 'true' : undefined}
            />
          </div>

          {pickerOpen && (
            <div role="listbox" aria-label={t('auth.aria.dialPicker')} className="absolute top-full left-0 mt-1.5 w-72 max-h-72 overflow-y-auto glass rounded-xl border shadow-2xl z-50">
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  role="option"
                  aria-selected={dialIso === c.iso}
                  onClick={() => { setDialIso(c.iso); setPickerOpen(false); }}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-3 hover:bg-[color:var(--bg-card-hover)] text-left text-sm',
                    dialIso === c.iso && 'bg-gold-400/10 text-gold-300',
                  )}
                >
                  <span className="text-base" aria-hidden="true">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-[color:var(--fg-muted)]">{c.dial}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.phone ? (
          <p role="alert" className="text-[11px] text-danger mt-1">{errors.phone}</p>
        ) : (
          <p className="text-[11px] text-[color:var(--fg-muted)] mt-1">
            {t('auth.phoneNote')}
          </p>
        )}
      </div>

      <div className="relative">
        <Lock size={15} className="absolute left-3 top-[34px] text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
        <Input
          id="signup-password"
          label={t('auth.password')}
          className="pl-9"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordPh')}
          required
          autoComplete="new-password"
          error={errors.password}
          suppressHydrationWarning
        />
      </div>

      {/* PB-03: role chooser. Whitelist enforced both client-side (zod) and
          server-side (signUpAction re-validates and falls back to 'user'). */}
      <div>
        <Label>{t('auth.accountType')}</Label>
        <div role="radiogroup" aria-label={t('auth.accountType')} className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((o) => {
            const active = role === o.v;
            const Icon = o.Icon;
            return (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`role-${o.v}`}
                onClick={() => setRole(o.v)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-gold-400 bg-gold-400/10 text-gold-300'
                    : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]',
                )}
              >
                <Icon size={15} aria-hidden="true" />
                <div className="mt-1 text-sm font-semibold">{t(o.labelKey)}</div>
                <div className="text-[11px] text-[color:var(--fg-muted)] leading-snug mt-0.5">{t(o.hintKey)}</div>
              </button>
            );
          })}
        </div>
        {errors.role && (
          <p role="alert" className="text-[11px] text-danger mt-1">{errors.role}</p>
        )}
      </div>

      {/* Ofis kaydı (Madde 5/6) — ülke + ülkeye göre şirket/belge bilgileri */}
      {role === 'office' && (
        <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-4 space-y-3">
          <div>
            <Label htmlFor="office-country">{t('auth.officeCountry')}</Label>
            <select
              id="office-country"
              value={officeCountry}
              onChange={(e) => setOfficeCountry(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[color:var(--bg-elev)] border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.iso} value={c.iso}>{c.flag} {c.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-[color:var(--fg-muted)] mt-1">{t('auth.officeCountryHint')}</p>
          </div>

          <p className="text-sm font-semibold text-gold-300">{t('office.docs.title')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input id="office-company" label={t('office.docs.companyName')} value={officeCompany} onChange={(e) => setOfficeCompany(e.target.value)} required />
            <Input
              id="office-national-id"
              label={officeCountry === 'AZ' ? t('office.id.az') : t('office.id.tr')}
              value={officeNationalId}
              onChange={(e) => setOfficeNationalId(e.target.value)}
              required
            />
            <Input id="office-tax-id" label={t('office.docs.taxId')} value={officeTaxId} onChange={(e) => setOfficeTaxId(e.target.value)} required />
            <Input id="office-auth-no" label={t('office.docs.authNo')} value={officeAuthNo} onChange={(e) => setOfficeAuthNo(e.target.value)} />
            <Input id="office-city" label={t('office.docs.city')} value={officeCity} onChange={(e) => setOfficeCity(e.target.value)} required />
            <Input id="office-district" label={t('office.docs.district')} value={officeDistrict} onChange={(e) => setOfficeDistrict(e.target.value)} />
            <div className="sm:col-span-2">
              <Input id="office-address" label={t('office.docs.address')} value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{t('office.docs.documents')}</Label>
            <input
              ref={docInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => uploadDoc(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={docUploading || officeDocs.length >= 12}
              className="mt-1 inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-3 py-2 text-sm hover:border-gold-400/60 disabled:opacity-50"
            >
              <Paperclip size={14} /> {docUploading ? t('office.docs.uploading') : t('office.docs.upload')}
            </button>
            {officeDocs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {officeDocs.map((d, i) => (
                  <li key={`${d.url}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-[color:var(--bg-elev)] px-2.5 py-1.5 text-xs">
                    <span className="truncate">{d.name}</span>
                    <button type="button" aria-label="Sil" onClick={() => setOfficeDocs((prev) => prev.filter((_, j) => j !== i))} className="text-danger shrink-0">
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div>
        {/* PF-03: real native checkbox with a stable id ("terms") + data-testid,
            so Playwright `.check()` and assistive tech both work without any
            custom keyboard-interaction shim. Visual styling is preserved. */}
        <label htmlFor="terms" className="flex items-start gap-2.5 text-sm text-[color:var(--fg-muted)] mt-2 cursor-pointer select-none py-1">
          <input
            id="terms"
            data-testid="terms-accept"
            type="checkbox"
            name="acceptedTerms"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 size-5 accent-gold-400 cursor-pointer shrink-0"
            aria-invalid={errors.acceptedTerms ? 'true' : undefined}
            aria-label={t('auth.aria.acceptTerms')}
          />
          <span className="leading-snug">
            <Link href="/legal-guide#terms" className="text-gold-300 hover:underline">{t('auth.terms.use')}</Link> {t('auth.terms.and')}{' '}
            <Link href="/legal-guide#kvkk" className="text-gold-300 hover:underline">{t('auth.terms.kvkk')}</Link>{' '}
            {t('auth.terms.accept')}
          </span>
        </label>
        {errors.acceptedTerms && (
          <p role="alert" className="text-[11px] text-danger mt-1">{errors.acceptedTerms}</p>
        )}
      </div>

      {serverError && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {serverError}
        </div>
      )}

      <Button type="submit" variant="gold" size="lg" className="w-full mt-1" loading={busy}>
        {t('auth.createAccount')} <ArrowRight size={14} aria-hidden="true" />
      </Button>

      <div className="text-center text-sm pt-2">
        <span className="text-[color:var(--fg-muted)]">{t('auth.haveAccount')} </span>
        <Link href="/auth/sign-in" className="text-gold-300 hover:text-gold-400">{t('auth.signInLink')}</Link>
      </div>
    </form>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forgotPasswordAction } from '@/lib/auth-actions';
import { forgotPasswordSchema, fieldErrors } from '@/lib/schemas';

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [serverErr, setServerErr] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr('');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await forgotPasswordAction(parsed.data.email);
    setBusy(false);
    if (!res.ok) {
      setServerErr(res.error);
      return;
    }
    setSent(true);
  }

  return (
    <>
      {!sent ? (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-[34px] text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
            <Input
              id="forgot-email"
              label="E-posta"
              className="pl-9"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              autoComplete="email"
              required
              error={errors.email}
              suppressHydrationWarning
            />
          </div>

          {serverErr && (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {serverErr}
            </div>
          )}

          <Button type="submit" variant="gold" size="lg" className="w-full" loading={busy}>
            Sıfırlama Linki Gönder
          </Button>
        </form>
      ) : (
        <div role="status" aria-live="polite" className="mt-6 text-center space-y-3">
          <div className="mx-auto size-14 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 size={26} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">Mail yola çıktı</h2>
          <p className="text-sm text-[color:var(--fg-muted)]">
            Eğer <strong>{email}</strong> kayıtlıysa, kısa süre içinde sıfırlama linki içeren bir mail alacaksın.
            Gelen kutunu (ve spam&apos;i) kontrol et — link 1 saat geçerli.
          </p>
        </div>
      )}

      <div className="mt-6 text-center text-sm">
        <Link href="/auth/sign-in" className="text-gold-300 hover:text-gold-400 inline-flex items-center gap-1">
          <ArrowLeft size={13} aria-hidden="true" /> Girişe dön
        </Link>
      </div>
    </>
  );
}

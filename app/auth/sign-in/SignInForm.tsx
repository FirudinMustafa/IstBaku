'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { signInAction } from '@/lib/auth-actions';
import { signInSchema, fieldErrors } from '@/lib/schemas';

export function SignInForm() {
  const sp = useSearchParams();
  const initialEmail = sp.get('email') ?? '';
  const { toast } = useToast();
  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [serverErr, setServerErr] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr('');
    // MC-14: client-side zod validation before hitting the server action.
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await signInAction(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (!res.ok) {
      setServerErr(res.error);
      return;
    }
    toast({ variant: 'success', title: `Hoş geldin, ${res.user.name}`, description: 'Yatırımcı paneline yönlendiriliyorsun.' });
    setTimeout(() => { window.location.href = '/dashboard'; }, 400);
  }

  return (
    <>
      {initialEmail && (
        <div role="status" className="mt-5 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success flex items-start gap-2">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>E-posta adresin doğrulandı. Şifrenle giriş yap.</span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-[34px] text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
          <Input
            id="signin-email"
            label="E-posta"
            className="pl-9"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seninadres@ornek.com"
            autoComplete="email"
            required
            error={errors.email}
            suppressHydrationWarning
          />
        </div>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-[34px] text-[color:var(--fg-muted)] pointer-events-none z-10" aria-hidden="true" />
          <Input
            id="signin-password"
            label="Şifre"
            className="pl-9"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            error={errors.password}
            suppressHydrationWarning
          />
        </div>

        {serverErr && (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {serverErr}
          </div>
        )}

        <Button type="submit" variant="gold" size="lg" className="w-full" loading={busy}>
          Giriş Yap <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-4 text-right">
        <Link href="/auth/forgot-password" className="text-sm text-gold-300 hover:text-gold-400">
          Şifreni mi unuttun?
        </Link>
      </div>

      <div className="mt-6 text-center text-sm">
        <span className="text-[color:var(--fg-muted)]">Hesabın yok mu? </span>
        <Link href="/auth/sign-up" className="text-gold-300 hover:text-gold-400">Kayıt ol</Link>
      </div>
    </>
  );
}
